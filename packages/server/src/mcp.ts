import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { InboxItemView } from '@project-tracker/contract';
import type { Actor } from '@project-tracker/core/domain';
import { identify, listInbox } from '@project-tracker/core/usecases';
import type { Hono } from 'hono';
import { z } from 'zod';
import { ANONYMOUS, bearerToken, resolveCaller, usecaseContext, type AppOptions } from './auth';
import { CATALOG, type Binding } from './catalog';

export interface Changes {
  notify: () => void;
  subscribe: (listener: (at: string) => void) => () => void;
}

/** What the server knows of one MCP session: the conversation behind it, and whether it takes pushes. */
interface SessionState {
  actor: Actor | null;
  channel: boolean;
  server?: McpServer;
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const TOKEN_ARGUMENT = z
  .string()
  .optional()
  .describe('Jeton de conversation, si cette session MCP ne s’est pas présentée');
const INTRODUCE_FIRST = 'Présente-toi d’abord avec introduce (un nom stable, par exemple front-1).';

/** MCP over HTTP (ADR 0011): the catalogue operations open to agents, one MCP server per session. */
export function mountMcp(app: Hono, options: AppOptions, changes: Changes): void {
  const sessions = new Map<
    string,
    { transport: WebStandardStreamableHTTPServerTransport; state: SessionState }
  >();
  changes.subscribe(() => {
    for (const { state } of sessions.values()) void push(options, state);
  });

  app.all('/mcp', async (c) => {
    const id = c.req.header('mcp-session-id');
    const existing = id ? sessions.get(id) : undefined;
    if (existing) return existing.transport.handleRequest(c.req.raw);
    if (id) return c.json({ error: 'unknownMcpSession' }, 404);
    const state: SessionState = {
      actor: null,
      channel: c.req.header('x-tracker-channel') === 'on',
    };
    const server = buildServer(options, changes, state);
    state.server = server;
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, { transport, state });
      },
      onsessionclosed: (sessionId) => {
        sessions.delete(sessionId);
      },
    });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });
}

function buildServer(options: AppOptions, changes: Changes, state: SessionState): McpServer {
  const server = new McpServer(
    { name: 'project-tracker', version: '2.0.0' },
    { capabilities: { experimental: { 'claude/channel': {} } } },
  );
  for (const binding of CATALOG.filter((candidate) =>
    candidate.operation.callers.includes('agent'),
  )) {
    registerOperation(server, binding, { options, changes, state });
  }
  server.registerTool(
    'waitForInbox',
    {
      description:
        'Attend une réponse ou un message du développeur, au plus timeoutSeconds ; à rappeler si rien n’arrive.',
      inputSchema: {
        timeoutSeconds: z.number().int().min(1).max(600).default(120),
        token: TOKEN_ARGUMENT,
      },
    },
    async ({ timeoutSeconds, token }, extra) => {
      const actor = actorOf(
        { options, changes, state },
        token,
        extra.requestInfo?.headers.authorization,
      );
      if (!actor) return refused(INTRODUCE_FIRST);
      const items = await waitForItems(options, changes, actor, timeoutSeconds * 1000);
      return reply(
        items.length === 0
          ? 'Rien pour l’instant ; rappelle waitForInbox ou continue autre chose.'
          : describeInbox(items),
      );
    },
  );
  return server;
}

interface ToolEnvironment {
  options: AppOptions;
  changes: Changes;
  state: SessionState;
}

function registerOperation(server: McpServer, binding: Binding, env: ToolEnvironment): void {
  const { operation } = binding;
  if (!(operation.input instanceof z.ZodObject)) {
    throw new Error(`${operation.name}: the input must be an object`);
  }
  const shape = operation.input.extend({ token: TOKEN_ARGUMENT }).shape;
  server.registerTool(
    operation.name,
    { description: operation.description, inputSchema: shape },
    async (args, extra) => {
      const { token, ...input } = args as Record<string, unknown>;
      const introducing = operation.name === 'introduce';
      const actor = introducing
        ? ANONYMOUS
        : actorOf(
            env,
            typeof token === 'string' ? token : undefined,
            extra.requestInfo?.headers.authorization,
          );
      if (!actor) return refused(INTRODUCE_FIRST);
      const result = await binding.run(usecaseContext(env.options, actor), input);
      if (!result.ok) return refused(`Refusé : ${result.error}`);
      if (operation.readOnly !== true) env.changes.notify();
      if (introducing) return introduced(env, result.value);
      return reply(JSON.stringify(result.value) + inboxSuffix(env.options, actor));
    },
  );
}

function introduced(env: ToolEnvironment, value: unknown): ToolResult {
  const token = z.object({ token: z.string() }).parse(value).token;
  env.state.actor = identify(usecaseContext(env.options, ANONYMOUS), token);
  return reply(
    `Présentation faite. Jeton : ${token}\nGarde-le : si une autre session MCP s’ouvre (conversation reprise), passe-le dans l’argument token.`,
  );
}

/** The conversation of the session, else the token given in the call or in the header; binds the session. */
function actorOf(
  env: ToolEnvironment,
  token: string | undefined,
  header: string | string[] | undefined,
): Actor | null {
  if (env.state.actor) return env.state.actor;
  const given = token ?? bearerToken(Array.isArray(header) ? header[0] : header);
  const caller = resolveCaller(env.options, given);
  if (caller?.kind !== 'agent') return null;
  env.state.actor = caller.actor;
  return caller.actor;
}

function inbox(options: AppOptions, actor: Actor): InboxItemView[] {
  const result = listInbox(usecaseContext(options, actor), {});
  return result.ok ? result.value.items : [];
}

/** Pull delivery (ADR 0007): what waits for the agent is joined to the result of its next call. */
function inboxSuffix(options: AppOptions, actor: Actor): string {
  const items = inbox(options, actor);
  return items.length === 0 ? '' : `\n\n${describeInbox(items)}`;
}

function describeInbox(items: readonly InboxItemView[]): string {
  const lines = items.map((item) =>
    item.kind === 'answer'
      ? `- [${item.key}] Réponse à « ${item.question ?? ''} » : ${item.body} (entryId ${item.entryId})`
      : `- [${item.key}] Message : ${item.body} (entryId ${item.entryId})`,
  );
  return `Du développeur, pour toi (confirme la prise en compte avec acknowledge) :\n${lines.join('\n')}`;
}

function waitForItems(
  options: AppOptions,
  changes: Changes,
  actor: Actor,
  timeoutMs: number,
): Promise<InboxItemView[]> {
  const ready = inbox(options, actor);
  if (ready.length > 0) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const finish = (items: InboxItemView[]): void => {
      clearTimeout(timer);
      unsubscribe();
      resolve(items);
    };
    const timer = setTimeout(() => {
      finish([]);
    }, timeoutMs);
    const unsubscribe = changes.subscribe(() => {
      const items = inbox(options, actor);
      if (items.length > 0) finish(items);
    });
  });
}

/** Push delivery (ADR 0020): only to a session that asked for the channel, so nothing is lost elsewhere. */
async function push(options: AppOptions, state: SessionState): Promise<void> {
  if (!state.channel || !state.actor || !state.server) return;
  for (const item of inbox(options, state.actor)) {
    await state.server.server.notification({
      method: 'notifications/claude/channel',
      params: {
        content: describeInbox([item]),
        meta: { ticket_key: item.key, entry_id: item.entryId, kind: item.kind },
      },
    });
  }
}

function reply(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function refused(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}
