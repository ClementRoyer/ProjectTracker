import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { readReply } from './reply';
import { usageSince } from './transcript';

/** Calls an operation of the tracker with the conversation token (null for `introduce`). */
export type Call = (operation: string, input: unknown, token: string | null) => Promise<unknown>;

export interface HookContext {
  call: Call;
  /** Where the adapter keeps, per Claude Code session, its token and the messages already counted. */
  stateDir: string;
  env: Readonly<Record<string, string | undefined>>;
}

const sessionState = z.object({
  token: z.string(),
  agentName: z.string(),
  seen: z.array(z.string()).default([]),
});
type SessionState = z.infer<typeof sessionState>;

const REPLY_FORMAT =
  'À la fin de chaque tour, termine ta réponse par un bloc ```json {"message": "ce que tu as fait ou trouvé, en une ou deux phrases", "question": null} ``` ; ' +
  'si tu as besoin d’une décision du développeur, mets "question": {"context": "…", "options": ["…", "…"], "recommendation": "…"}.';

/** SessionStart (ADR 0011): the adapter introduces the conversation, and keeps it when Claude Code resumes it. */
export async function onSessionStart(
  input: { session_id: string; cwd: string; source: string },
  ctx: HookContext,
): Promise<{ hookSpecificOutput: { hookEventName: 'SessionStart'; additionalContext: string } }> {
  const context = (
    text: string,
  ): { hookSpecificOutput: { hookEventName: 'SessionStart'; additionalContext: string } } => ({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
  });
  let state = readState(ctx.stateDir, input.session_id);
  if (!state) {
    const name = ctx.env.TRACKER_AGENT_NAME ?? `front-${basename(input.cwd)}`;
    try {
      const introduced = z
        .object({ token: z.string(), agentName: z.string() })
        .parse(await ctx.call('introduce', { name, tool: 'claude-code' }, null));
      state = { token: introduced.token, agentName: introduced.agentName, seen: [] };
      writeState(ctx.stateDir, input.session_id, state);
    } catch {
      return context(
        'Le tracker de tickets est injoignable : rien n’est suivi pour cette conversation. Le développeur peut le lancer avec « npm start » dans le projet.',
      );
    }
  }
  const documents = await referenceDocuments(ctx, state.token);
  return context(
    [
      `Tu es suivi par le tracker de tickets sous le nom ${state.agentName}.`,
      `Ta conversation est déjà présentée : n’appelle pas introduce. Ton jeton de conversation : ${state.token} ; passe-le dans l’argument token de ton premier appel aux outils MCP « tracker », ensuite la session le connaît.`,
      'Prends ton ticket avec takeTicket (rôle front) avant de travailler dessus, et rapporte ton avancement avec reportProgress.',
      'Après chaque passage de tests, enregistre-le avec recordTestRun. Pour une ressource partagée (par exemple les tests e2e), lance la commande avec « node tools/tracker/app/tracker.js resource run <ressource> --key <ticket> -- <commande> » : elle attend son tour et garde la ressource pendant la commande.',
      'Pour commiter, utilise « node tools/tracker/app/tracker.js commit "<gitmoji> <phrase simple en anglais>" [--ticket <ticket>] » : une ligne de 72 caractères au plus, sans co-auteur ; dans le dossier d’un ticket, tout ce qui a changé est commité, dans le dossier principal seulement ce qui est indexé.',
      ...documents,
      REPLY_FORMAT,
    ].join('\n'),
  );
}

/** The reference documents of the project, to read before working (ADR 0040); none if the tracker has none. */
async function referenceDocuments(ctx: HookContext, token: string): Promise<string[]> {
  try {
    const listed = z
      .object({ documents: z.array(z.object({ path: z.string() })) })
      .parse(await ctx.call('listDocuments', {}, token));
    if (listed.documents.length === 0) return [];
    const paths = listed.documents.map((document) => document.path).join(', ');
    return [
      `Documents de référence du projet : ${paths}. Lis ceux qui concernent ton ticket (outil readDocument, ou directement depuis la racine du projet).`,
    ];
  } catch {
    return [];
  }
}

/** UserPromptSubmit: a turn begins, the agent works (ADR 0028); never blocks the prompt. */
export async function onPromptSubmit(
  input: { session_id: string },
  ctx: HookContext,
): Promise<void> {
  const state = readState(ctx.stateDir, input.session_id);
  if (!state) return;
  await ctx.call('reportWorking', { working: true }, state.token).catch(() => undefined);
}

/** Stop: hands the end-of-turn reply and the usage measured since the last turn; never fails the turn. */
export async function onStop(
  input: {
    session_id: string;
    transcript_path: string;
    last_assistant_message?: string | undefined;
    stop_hook_active: boolean;
  },
  ctx: HookContext,
): Promise<void> {
  const state = readState(ctx.stateDir, input.session_id);
  if (!state) return;
  const message = input.last_assistant_message ?? '';
  if (message.trim() !== '') {
    await ctx.call('submitReply', readReply(message), state.token).catch(() => undefined);
  }
  await ctx.call('reportWorking', { working: false }, state.token).catch(() => undefined);
  const measured = usageSince(input.transcript_path, new Set(state.seen));
  if (measured.usage.length === 0) return;
  try {
    await ctx.call('recordUsage', { provenance: 'measured', usage: measured.usage }, state.token);
    writeState(ctx.stateDir, input.session_id, {
      ...state,
      seen: [...state.seen, ...measured.messageIds],
    });
  } catch {
    // Counted at the next turn: the messages stay unseen.
  }
}

function stateFile(stateDir: string, sessionId: string): string {
  return join(stateDir, `${sessionId.replace(/[^\w-]/g, '_')}.json`);
}

function readState(stateDir: string, sessionId: string): SessionState | null {
  const file = stateFile(stateDir, sessionId);
  if (!existsSync(file)) return null;
  const parsed = sessionState.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data : null;
}

function writeState(stateDir: string, sessionId: string, state: SessionState): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile(stateDir, sessionId), JSON.stringify(state), { mode: 0o600 });
}
