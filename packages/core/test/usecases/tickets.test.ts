import { describe, expect, it } from 'vitest';
import {
  createTicket,
  getTicket,
  listTickets,
  markTicketRead,
  reportProgress,
  setPriority,
} from '../../src/usecases';
import { agent, DAY, testContext } from './context';

const created = (ctx: ReturnType<typeof testContext>, title: string): string => {
  const result = createTicket(ctx, { title });
  if (!result.ok) throw new Error(result.error);
  return result.value.key;
};

describe('tickets', () => {
  it('gives a new local ticket the next LOC key, not started in "To do"', () => {
    const ctx = testContext();
    expect(created(ctx, 'Clean the test logs')).toBe('LOC-1');
    expect(created(ctx, 'Rename a column')).toBe('LOC-2');
    const ticket = getTicket(ctx, { key: 'LOC-2' });
    expect(ticket.ok && ticket.value.situation).toEqual({
      phase: 'todo',
      progress: { state: 'notStarted' },
      wait: null,
      closedAt: null,
    });
  });

  it('refuses a ticket without a title', () => {
    expect(createTicket(testContext(), { title: '   ' })).toEqual({
      ok: false,
      error: 'emptyTitle',
    });
  });

  it('lets an agent create a ticket too, and journals who did', () => {
    const ctx = testContext(agent);
    const key = created(ctx, 'Found a bug while testing');
    const ticket = getTicket(ctx, { key });
    expect(ticket.ok && ticket.value.entries.map((e) => e.authorKind)).toEqual(['agent']);
  });

  it('keeps the initial request when it says more than the title', () => {
    const ctx = testContext();
    createTicket(ctx, {
      title: 'Export',
      initialRequest: 'Export the orders as CSV for accounting.',
    });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.initialRequest).toBe(
      'Export the orders as CSV for accounting.',
    );
  });

  it('finds nothing for an unknown key', () => {
    expect(getTicket(testContext(), { key: 'NOPE-1' })).toEqual({
      ok: false,
      error: 'ticketNotFound',
    });
  });

  it('lists open tickets with their situation and last activity', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets.map((t) => [t.key, t.situation.phase])).toEqual([
      [key, 'todo'],
    ]);
  });

  it('flags a ticket in progress without news past the threshold as stale', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    reportProgress(ctx, { key, progress: { state: 'inProgress', note: 'three sources found' } });
    ctx.advance(2 * DAY);
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets[0]?.stale).toBe(true);
  });

  it('marks as unread a ticket changed by an agent since the last visit', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    reportProgress(ctx.as(agent), { key, progress: { state: 'inProgress', note: 'started' } });
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets[0]?.unread).toBe(true);
  });

  it('clears the unread mark of a ticket when the developer reads it, and of that ticket only', () => {
    const ctx = testContext();
    const first = created(ctx, 'Clean the test logs');
    const second = created(ctx, 'Export the orders');
    for (const key of [first, second]) {
      reportProgress(ctx.as(agent), { key, progress: { state: 'inProgress', note: 'started' } });
    }
    markTicketRead(ctx, { key: first });
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets.map((t) => [t.key, t.unread])).toEqual([
      [first, false],
      [second, true],
    ]);
  });

  it('marks a read ticket unread again when an agent writes on it afterwards', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    markTicketRead(ctx, { key });
    reportProgress(ctx.as(agent), { key, progress: { state: 'inProgress', note: 'started' } });
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets[0]?.unread).toBe(true);
  });

  it('starts a ticket at normal priority (ADR 0032)', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    const ticket = getTicket(ctx, { key });
    expect(ticket.ok && ticket.value.priority).toBe('normal');
  });

  it('notes a change of priority in the journal', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    expect(setPriority(ctx, { key, priority: 'urgent' })).toEqual({
      ok: true,
      value: { priority: 'urgent' },
    });
    const ticket = getTicket(ctx, { key });
    expect(ticket.ok && ticket.value.entries.at(-1)?.body).toBe('Priority: normal → urgent');
  });

  it('writes nothing when the priority does not change', () => {
    const ctx = testContext();
    const key = created(ctx, 'Clean the test logs');
    setPriority(ctx, { key, priority: 'normal' });
    const ticket = getTicket(ctx, { key });
    expect(ticket.ok && ticket.value.entries).toHaveLength(1);
  });
});
