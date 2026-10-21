import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { CATALOG, findBinding, type Binding } from './catalog';
import {
  ANONYMOUS,
  requestToken,
  resolveCaller,
  usecaseContext,
  type AppOptions,
  type Caller,
} from './auth';
import { listenAddresses } from './config';
import { mountMcp } from './mcp';
import { mountAttachments } from './attachments';
import { mountPage } from './page';
import { mountProjects } from './projects';

export type { AppOptions } from './auth';

const tokenOf = (c: Context): string | null => requestToken((name) => c.req.header(name));

/** The HTTP server of ADR 0011: the only door to the database. */
export function createApp(options: AppOptions): Hono {
  const app = new Hono();
  const listeners = new Set<(at: string) => void>();
  const allowedHosts = listenAddresses(options.config);
  const notifyChanged = (): void => {
    const at = new Date().toISOString();
    for (const listener of listeners) listener(at);
  };

  app.use('*', async (c, next) => {
    if (!allowedHosts.includes(c.req.header('host') ?? '')) return c.json({ error: 'host' }, 403);
    await next();
  });

  mountPage(app, options.webRoot, options.developerToken);

  app.get('/api', (c) => {
    if (!resolveCaller(options, tokenOf(c))) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.json({ operations: CATALOG.map((binding) => describe(binding)) });
  });

  app.get('/api/events', (c) => {
    if (resolveCaller(options, c.req.query('token') ?? null)?.kind !== 'developer') {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return streamSSE(c, async (stream) => {
      const send = (at: string): void => void stream.writeSSE({ event: 'changed', data: at });
      listeners.add(send);
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          listeners.delete(send);
          resolve();
        });
      });
    });
  });

  mountMcp(app, options, {
    notify: notifyChanged,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });

  mountAttachments(app, options, notifyChanged);
  mountProjects(app, options, `http://${options.config.host}:${String(options.config.port)}`);

  const changes = {
    notify: notifyChanged,
    waitForChange: (ms: number): Promise<void> =>
      new Promise((resolve) => {
        const done = (): void => {
          clearTimeout(timer);
          listeners.delete(done);
          resolve();
        };
        const timer = setTimeout(done, ms);
        listeners.add(done);
      }),
  };
  app.post('/api/:operation', (c) => runOperation(c, options, changes));

  return app;
}

type Changes = { notify: () => void; waitForChange: (ms: number) => Promise<void> };
type Prepared = { binding: Binding; caller: Caller; input: unknown };

/** POST /api/<operation>: 401 without a valid token, 403 for a caller it is not open to, 400 for a bad input, 409 for a business refusal. */
async function runOperation(c: Context, options: AppOptions, changes: Changes): Promise<Response> {
  const prepared = await prepare(c, options);
  if (prepared instanceof Response) return prepared;
  const { binding, caller, input } = prepared;
  const run = (): ReturnType<Binding['run']> =>
    binding.run(usecaseContext(options, caller.actor), input);
  let result = await run();
  const deadline = Date.now() + waitSeconds(input) * 1000;
  // Long poll (the launcher, ADR 0010): wait for a change rather than be called again and again.
  while (
    binding.operation.longPoll === true &&
    result.ok &&
    hasNoRequest(result.value) &&
    Date.now() < deadline
  ) {
    await changes.waitForChange(deadline - Date.now());
    result = await run();
  }
  if (!result.ok) return c.json({ error: result.error }, 409);
  if (binding.operation.readOnly !== true) changes.notify();
  return c.json(result.value as object);
}

async function prepare(c: Context, options: AppOptions): Promise<Prepared | Response> {
  const binding = findBinding(c.req.param('operation') ?? '');
  if (!binding) return c.json({ error: 'unknownOperation' }, 404);
  const caller =
    binding.operation.name === 'introduce'
      ? { kind: 'agent' as const, actor: ANONYMOUS }
      : resolveCaller(options, tokenOf(c));
  if (!caller) return c.json({ error: 'unauthorized' }, 401);
  if (!binding.operation.callers.includes(caller.kind)) return c.json({ error: 'forbidden' }, 403);
  const input = binding.operation.input.safeParse(await c.req.json().catch(() => undefined));
  if (!input.success) {
    return c.json({ error: 'invalidInput', issues: z.treeifyError(input.error) }, 400);
  }
  return { binding, caller, input: input.data };
}

function waitSeconds(input: unknown): number {
  const parsed = z.object({ waitSeconds: z.number() }).safeParse(input);
  return parsed.success ? parsed.data.waitSeconds : 0;
}

function hasNoRequest(value: unknown): boolean {
  return z.object({ request: z.null() }).safeParse(value).success;
}

function describe(binding: Binding): object {
  const { name, description, callers, readOnly } = binding.operation;
  return {
    name,
    description,
    callers,
    readOnly: readOnly === true,
    input: z.toJSONSchema(binding.operation.input),
  };
}
