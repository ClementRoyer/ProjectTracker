import { describe, expect, it } from 'vitest';
import { appendEntry, findTicketByKey, insertQuestion } from '../../src/store';
import {
  changePhase,
  createTicket,
  getTicket,
  listNovelties,
  listWaitingForMe,
  markVisited,
  recordEntry,
  reportProgress,
} from '../../src/usecases';
import { agent, testContext } from './context';

describe('journal', () => {
  it('keeps a decision word for word, with its author', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by customer name' });
    recordEntry(ctx.as(agent), {
      key: 'LOC-1',
      entryType: 'decision',
      body: 'Start after three letters, to avoid noise.',
    });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)).toMatchObject({
      entryType: 'decision',
      authorKind: 'agent',
      body: 'Start after three letters, to avoid noise.',
    });
  });

  it('refuses an empty entry', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by customer name' });
    expect(recordEntry(ctx, { key: 'LOC-1', entryType: 'progress', body: '' })).toEqual({
      ok: false,
      error: 'emptyBody',
    });
  });
});

describe('novelties', () => {
  it('shows everything the agents did on a first visit, but not what the developer did', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by customer name' });
    reportProgress(ctx.as(agent), {
      key: 'LOC-1',
      progress: { state: 'inProgress', note: 'started' },
    });
    const novelties = listNovelties(ctx, {});
    expect(novelties.ok && novelties.value).toMatchObject({
      since: null,
      entries: [{ key: 'LOC-1', authorKind: 'agent' }],
    });
  });

  it('shows only what happened since the last visit', () => {
    const ctx = testContext();
    createTicket(ctx.as(agent), { title: 'Search by customer name' });
    markVisited(ctx, {});
    changePhase(ctx.as(agent), { key: 'LOC-1', phase: 'analysis' });
    const novelties = listNovelties(ctx, {});
    expect(novelties.ok && novelties.value.entries.map((e) => e.body)).toEqual([
      'Phase : À faire → Analyse',
    ]);
  });
});

describe('waiting for me', () => {
  it('lists open questions and tickets ready to close, oldest first', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Date format' });
    changePhase(ctx, { key: 'LOC-1', phase: 'qaValidation' });
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'done' } });
    createTicket(ctx, { title: 'Search by customer name' });
    const ticketId = findTicketByKey(ctx.db, 'LOC-2')?.id ?? '';
    appendEntry(ctx.db, {
      id: 'q1',
      ticketId,
      entryType: 'question',
      authorKind: 'agent',
      body: 'Which rule?',
      createdAt: '2026-10-19T08:00:00.000Z',
    });
    insertQuestion(ctx.db, { entryId: 'q1', ticketId, options: [], status: 'open' });
    const waiting = listWaitingForMe(ctx, {});
    expect(waiting.ok && waiting.value.items.map((i) => [i.kind, i.key])).toEqual([
      ['question', 'LOC-2'],
      ['close', 'LOC-1'],
    ]);
  });
});
