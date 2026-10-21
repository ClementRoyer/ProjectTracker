import { describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { createApp } from '../src/app';
import { parseConfig } from '../src/config';

const DEVELOPER = 'developer-token-for-tests';

const setUp = (): ReturnType<typeof createApp> => {
  const config = parseConfig({});
  if (!config.ok) throw new Error(config.error);
  return createApp({
    db: openDatabase(':memory:'),
    config: config.value,
    developerToken: DEVELOPER,
  });
};

const call = (
  app: ReturnType<typeof createApp>,
  operation: string,
  body: unknown,
  { token = DEVELOPER, host = '127.0.0.1:9620' }: { token?: string | null; host?: string } = {},
): Promise<Response> =>
  Promise.resolve(
    app.request(`/api/${operation}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

const agentToken = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const response = await call(app, 'introduce', { name: 'front-1' }, { token: null });
  const body = (await response.json()) as { token: string };
  return body.token;
};

describe('HTTP API (ADR 0026, 0027)', () => {
  it('runs an operation of the catalogue for the developer', async () => {
    const app = setUp();
    const response = await call(app, 'createTicket', { title: 'Search by customer name' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ key: 'LOC-1' });
  });

  it('takes the token from X-Tracker-Token too, for proxies that keep Authorization (ADR 0055)', async () => {
    const app = setUp();
    const response = await app.request('/api/listTickets', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: '127.0.0.1:9620',
        'x-tracker-token': DEVELOPER,
      },
      body: '{}',
    });
    expect(response.status).toBe(200);
  });

  it('refuses a request without a token', async () => {
    const response = await call(setUp(), 'listTickets', {}, { token: null });
    expect(response.status).toBe(401);
  });

  it('lets a new conversation introduce itself without a token, then use its own', async () => {
    const app = setUp();
    const token = await agentToken(app);
    expect((await call(app, 'listTickets', {}, { token })).status).toBe(200);
  });

  it('refuses an operation the caller may not use: an agent cannot close a ticket', async () => {
    const app = setUp();
    const token = await agentToken(app);
    const response = await call(app, 'closeTicket', { key: 'LOC-1' }, { token });
    expect(response.status).toBe(403);
  });

  it('explains which field of the input is wrong', async () => {
    const response = await call(setUp(), 'changePhase', { key: 'LOC-1', phase: 'nowhere' });
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toMatch(/phase/);
  });

  it('returns a business refusal with its code', async () => {
    const response = await call(setUp(), 'getTicket', { key: 'NOPE-1' });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'ticketNotFound' });
  });

  it('knows no operation outside the catalogue', async () => {
    expect((await call(setUp(), 'dropDatabase', {})).status).toBe(404);
  });

  it('refuses a request sent to another host name (DNS rebinding)', async () => {
    const response = await call(setUp(), 'listTickets', {}, { host: 'evil.example.test' });
    expect(response.status).toBe(403);
  });

  it('tells the page that something changed after a write', async () => {
    const app = setUp();
    const events = await app.request(`/api/events?token=${DEVELOPER}`, {
      headers: { host: '127.0.0.1:9620' },
    });
    const reader = events.body?.pipeThrough(new TextDecoderStream()).getReader();
    await call(app, 'createTicket', { title: 'Search by customer name' });
    const chunk = await reader?.read();
    expect(chunk?.value).toMatch(/event: changed/);
    await reader?.cancel();
  });

  it('refuses the event stream to anyone but the developer', async () => {
    const events = await setUp().request('/api/events?token=wrong', {
      headers: { host: '127.0.0.1:9620' },
    });
    expect(events.status).toBe(401);
  });

  it('keeps a launcher waiting until a back-end request comes (long poll)', async () => {
    const config = parseConfig({});
    if (!config.ok) throw new Error(config.error);
    const app = createApp({
      db: openDatabase(':memory:'),
      config: config.value,
      developerToken: DEVELOPER,
      launcherToken: 'launcher-token',
    });
    await call(app, 'createTicket', { title: 'Export orders' });
    const waiting = call(
      app,
      'takeBackendRequest',
      { launcher: 'backend-server', waitSeconds: 10 },
      { token: 'launcher-token' },
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    await call(app, 'requestBackend', { key: 'LOC-1', text: 'Add an export route.' });
    const body = (await (await waiting).json()) as { request: { key: string } | null };
    expect(body.request?.key).toBe('LOC-1');
  });

  it('describes the catalogue, so that the CLI and the agents can list the operations', async () => {
    const response = await setUp().request('/api', {
      headers: { host: '127.0.0.1:9620', authorization: `Bearer ${DEVELOPER}` },
    });
    const body = (await response.json()) as { operations: { name: string }[] };
    expect(body.operations.map((operation) => operation.name)).toContain('reportProgress');
  });
});
