import { describe, expect, it } from 'vitest';
import type { UsecaseContext } from '../../src/usecases';
import {
  answerQuestion,
  createTicket,
  finishExecution,
  getTicket,
  identify,
  introduce,
  launcherHeartbeat,
  listInbox,
  listWaitingForMe,
  requestBackend,
  sendMessage,
  setPriority,
  takeBackendRequest,
  takeTicket,
} from '../../src/usecases';
import { testContext } from './context';

type Ctx = ReturnType<typeof testContext>;

const reply = (
  status: 'done' | 'blocked' | 'question',
  message: string,
  question: { context: string; options: string[]; recommendation: string } | null = null,
) => ({
  status,
  message,
  question,
  progress: { done: [], remaining: [] },
  changedFiles: [],
});

const finished = { changedFiles: [], undeclared: [], uncertainAuthor: false, seconds: 12 };

const setUp = (): { ctx: Ctx; front: UsecaseContext } => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Export orders as CSV' });
  const introduced = introduce(ctx, { name: 'front-1' });
  const actor = introduced.ok ? identify(ctx, introduced.value.token) : null;
  if (!actor) throw new Error('no conversation');
  const front = ctx.as(actor);
  takeTicket(front, { key: 'LOC-1', role: 'front' });
  requestBackend(front, { key: 'LOC-1', text: 'Add a paginated export route.' });
  return { ctx, front };
};

const take = (
  ctx: Ctx,
): { requestId: string; executionId: string; key: string; prompt: string } | null => {
  const taken = takeBackendRequest(ctx, { launcher: 'backend-server' });
  return taken.ok ? taken.value.request : null;
};

const waitOf = (ctx: Ctx): unknown => {
  const ticket = getTicket(ctx, { key: 'LOC-1' });
  return ticket.ok ? ticket.value.situation.wait : null;
};

describe('back-end requests (ADR 0010)', () => {
  it('makes the ticket wait for the back-end, and journals the request word for word', () => {
    const { ctx } = setUp();
    expect(waitOf(ctx)).toMatchObject({ kind: 'backend' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)).toMatchObject({
      entryType: 'request',
      role: 'backend',
      body: 'Add a paginated export route.',
    });
  });

  it('turns a message of the developer to the back-end into a request', () => {
    const { ctx } = setUp();
    sendMessage(ctx, { key: 'LOC-1', to: 'backend', body: 'Also add a total row.' });
    expect(
      ctx.db.prepare("SELECT count(*) AS n FROM backendRequest WHERE status = 'pending'").get()?.n,
    ).toBe(2);
  });

  it('hands the oldest request to the launcher, with a launch text holding the ticket and its journal', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    expect(job?.key).toBe('LOC-1');
    expect(job?.prompt).toMatch(/Export orders as CSV/);
    expect(job?.prompt).toMatch(/Add a paginated export route\./);
  });

  it('runs at most one execution at a time on a ticket', () => {
    const { ctx, front } = setUp();
    requestBackend(front, { key: 'LOC-1', text: 'And a total row.' });
    expect(take(ctx)).not.toBeNull();
    expect(take(ctx)).toBeNull();
  });

  it('journals the reply, brings it to the front agent and lifts the wait', () => {
    const { ctx, front } = setUp();
    const job = take(ctx);
    finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      reply: reply('done', 'Route added: GET /orders/export.'),
      ...finished,
    });
    expect(waitOf(ctx)).toBeNull();
    const inbox = listInbox(front, {});
    expect(inbox.ok && inbox.value.items.map((item) => item.body)).toEqual([
      'Route added: GET /orders/export.',
    ]);
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)).toMatchObject({
      entryType: 'exchange',
      authorKind: 'launcher',
      role: 'backend',
    });
  });

  it('keeps a failed execution in the journal and marks the request failed', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    const result = finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      failure: 'agent stopped after 300 s',
      ...finished,
    });
    expect(result.ok && result.value.status).toBe('failed');
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)?.body).toMatch(/agent stopped after 300 s/);
  });

  it('asks the developer the question of the back-end, and sends the answer back as a new request', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      reply: reply('question', 'Should cancelled orders be exported?', {
        context: 'About 3% of the rows.',
        options: ['No', 'Yes'],
        recommendation: 'No',
      }),
      ...finished,
    });
    const waiting = listWaitingForMe(ctx, {});
    const questionId = waiting.ok ? (waiting.value.items[0]?.questionId ?? '') : '';
    answerQuestion(ctx, { questionId, answer: 'No.' });
    expect(take(ctx)?.prompt).toMatch(/No\./);
  });

  it('flags a change made without a hold, uncertain when several executions ran', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      reply: reply('done', 'Done.'),
      ...finished,
      undeclared: ['api/users.js'],
      uncertainAuthor: true,
    });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)?.body).toBe(
      'Undeclared change: api/users.js (uncertain author)',
    );
  });

  it('waits while the file is held by another ticket, then hands the request again once released (ADR 0021)', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    launcherHeartbeat(ctx, {
      name: 'backend-server',
      running: [],
      holds: [{ path: 'api/orders.js', key: 'LOC-9' }],
    });
    const result = finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      reply: reply('blocked', 'api/orders.js is held.'),
      ...finished,
      blockedOn: { path: 'api/orders.js', heldBy: 'LOC-9' },
    });
    expect(result.ok && result.value.status).toBe('waiting');
    expect(waitOf(ctx)).toMatchObject({ kind: 'fileHold', detail: 'api/orders.js (LOC-9)' });
    expect(take(ctx)).toBeNull();
    launcherHeartbeat(ctx, { name: 'backend-server', running: [], holds: [] });
    expect(take(ctx)?.key).toBe('LOC-1');
  });

  it('hands first the request of the most urgent ticket when a held file is released (ADR 0021, 0032)', () => {
    const { ctx, front } = setUp();
    createTicket(ctx, { title: 'Import orders' });
    takeTicket(front, { key: 'LOC-2', role: 'front' });
    requestBackend(front, { key: 'LOC-2', text: 'Add an import route.' });
    setPriority(ctx, { key: 'LOC-2', priority: 'high' });
    launcherHeartbeat(ctx, {
      name: 'backend-server',
      running: [],
      holds: [{ path: 'api/orders.js', key: 'LOC-9' }],
    });
    for (let index = 0; index < 2; index += 1) {
      const job = take(ctx);
      finishExecution(ctx, {
        executionId: job?.executionId ?? '',
        reply: reply('blocked', 'api/orders.js is held.'),
        ...finished,
        blockedOn: { path: 'api/orders.js', heldBy: 'LOC-9' },
      });
    }
    launcherHeartbeat(ctx, { name: 'backend-server', running: [], holds: [] });
    expect(take(ctx)?.key).toBe('LOC-2');
  });

  it('records the measured AI usage on the ticket (ADR 0012)', () => {
    const { ctx } = setUp();
    const job = take(ctx);
    finishExecution(ctx, {
      executionId: job?.executionId ?? '',
      reply: reply('done', 'Done.'),
      ...finished,
      usage: [
        {
          model: 'model-a',
          inputTokens: 10,
          outputTokens: 500,
          cacheReadTokens: 9000,
          cacheWriteTokens: 300,
        },
      ],
    });
    expect(
      ctx.db
        .prepare('SELECT outputTokens, provenance FROM usage')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ outputTokens: 500, provenance: 'measured' }]);
  });
});
