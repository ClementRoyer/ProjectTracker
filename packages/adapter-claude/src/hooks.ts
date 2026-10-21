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
  'At the end of every turn, finish your reply with a block ```json {"message": "what you did or found, in one or two sentences", "question": null} ```; ' +
  'if you need a decision from the developer, set "question": {"context": "...", "options": ["...", "..."], "recommendation": "..."}.';

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
        'The ticket tracker cannot be reached: nothing is tracked for this conversation. The developer can start it with "npm start" in the project.',
      );
    }
  }
  const documents = await referenceDocuments(ctx, state.token);
  return context(
    [
      `You are tracked by the ticket tracker as ${state.agentName}.`,
      `Your conversation is already introduced: do not call introduce. Your conversation token: ${state.token}; pass it in the token argument of your first call to the "tracker" MCP tools, after that the session knows it.`,
      'Take your ticket with takeTicket (role front) before working on it, and report your progress with reportProgress.',
      'After every test run, record it with recordTestRun. For a shared resource (for example the e2e tests), run the command with "node tools/tracker/app/tracker.js resource run <resource> --key <ticket> -- <command>": it waits its turn and keeps the resource during the command.',
      'To commit, use "node tools/tracker/app/tracker.js commit "<gitmoji> <simple English sentence>" [--ticket <ticket>]": one line of 72 characters at most, no co-author; in a ticket working folder, everything that changed is committed, in the main folder only what is staged.',
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
      `Reference documents of the project: ${paths}. Read those that concern your ticket (readDocument tool, or directly from the project root).`,
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
