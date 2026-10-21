import { describe, expect, it } from 'vitest';
import { createTicket, getTicket, listTickets, setGroup } from '../../src/usecases';
import { testContext } from './context';

describe('ticket groups (F31, ADR 0040)', () => {
  it('puts tickets in a group made at first use, shared by name', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    createTicket(ctx, { title: 'Search by city' });
    setGroup(ctx, { key: 'LOC-1', group: 'Search' });
    setGroup(ctx, { key: 'LOC-2', group: 'Search' });
    const listed = listTickets(ctx, {});
    expect(listed.ok && listed.value.tickets.map((ticket) => ticket.group)).toEqual([
      'Search',
      'Search',
    ]);
    expect(ctx.db.prepare('SELECT count(*) AS n FROM "group"').get()).toEqual({ n: 1 });
  });

  it('takes a ticket out of its group, and notes it in the journal', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    setGroup(ctx, { key: 'LOC-1', group: 'Search' });
    setGroup(ctx, { key: 'LOC-1', group: null });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.group).toBeNull();
    expect(ticket.ok && ticket.value.entries.slice(-2).map((entry) => entry.body)).toEqual([
      'Groupe : Search',
      'Groupe : aucun',
    ]);
  });
});
