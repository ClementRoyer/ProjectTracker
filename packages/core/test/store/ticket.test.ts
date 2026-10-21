import { describe, expect, it } from 'vitest';
import type { Ticket } from '../../src/domain';
import {
  appendEntry,
  findTicketByKey,
  insertTicket,
  listEntries,
  openDatabase,
  readSituation,
  saveSituation,
} from '../../src/store';

const ticket: Ticket = {
  id: 't1',
  key: 'DEMO-1',
  origin: 'jira',
  title: 'Show the order date',
  priority: 'normal',
  jiraUrl: 'https://jira.example.test/browse/DEMO-1',
  createdAt: '2026-10-19T09:00:00.000Z',
};

const withTicket = (): ReturnType<typeof openDatabase> => {
  const db = openDatabase(':memory:');
  insertTicket(db, ticket);
  return db;
};

describe('ticket store', () => {
  it('finds a ticket by its key, with only the fields it has', () => {
    expect(findTicketByKey(withTicket(), 'DEMO-1')).toEqual(ticket);
  });

  it('finds nothing for an unknown key', () => {
    expect(findTicketByKey(withTicket(), 'DEMO-2')).toBeNull();
  });

  it('refuses a second ticket with the same key', () => {
    const db = withTicket();
    expect(() => {
      insertTicket(db, { ...ticket, id: 't2' });
    }).toThrow(/UNIQUE/);
  });
});

describe('situation store', () => {
  it('reads back the phase, the progress note and the wait', () => {
    const db = withTicket();
    saveSituation(db, {
      ticketId: 't1',
      situation: { phase: 'development', progress: { state: 'inProgress', note: 'Form done' } },
      wait: { kind: 'partner', since: '2026-10-19T10:00:00.000Z', detail: 'Payment provider' },
      updatedAt: '2026-10-19T10:00:00.000Z',
    });
    expect(readSituation(db, 't1')).toEqual({
      ticketId: 't1',
      situation: { phase: 'development', progress: { state: 'inProgress', note: 'Form done' } },
      wait: { kind: 'partner', since: '2026-10-19T10:00:00.000Z', detail: 'Payment provider' },
      updatedAt: '2026-10-19T10:00:00.000Z',
    });
  });

  it('keeps the closing date on the ticket, and reads it back in the situation', () => {
    const db = withTicket();
    saveSituation(db, {
      ticketId: 't1',
      situation: {
        phase: 'qaValidation',
        progress: { state: 'done' },
        closedAt: '2026-10-20T08:00:00.000Z',
      },
      wait: null,
      updatedAt: '2026-10-20T08:00:00.000Z',
    });
    expect(readSituation(db, 't1')?.situation.closedAt).toBe('2026-10-20T08:00:00.000Z');
  });

  it('replaces the previous situation of the ticket', () => {
    const db = withTicket();
    const first = {
      ticketId: 't1',
      situation: { phase: 'todo' as const, progress: { state: 'notStarted' as const } },
      wait: null,
      updatedAt: '2026-10-19T09:00:00.000Z',
    };
    saveSituation(db, first);
    saveSituation(db, { ...first, situation: { phase: 'analysis', progress: { state: 'done' } } });
    expect(readSituation(db, 't1')?.situation.phase).toBe('analysis');
  });
});

describe('journal store', () => {
  it('lists the entries of a ticket in time order, with their data', () => {
    const db = withTicket();
    appendEntry(db, {
      id: 'e1',
      ticketId: 't1',
      entryType: 'question',
      authorKind: 'agent',
      role: 'front',
      body: 'Keep the old date format?',
      data: { options: ['yes', 'no'] },
      createdAt: '2026-10-19T10:00:00.000Z',
    });
    appendEntry(db, {
      id: 'e2',
      ticketId: 't1',
      entryType: 'answer',
      authorKind: 'developer',
      body: 'Yes, keep it',
      replyTo: 'e1',
      createdAt: '2026-10-19T11:00:00.000Z',
    });
    appendEntry(db, {
      id: 'e0',
      ticketId: 't1',
      entryType: 'progress',
      authorKind: 'agent',
      body: 'Started the analysis',
      createdAt: '2026-10-19T09:30:00.000Z',
    });
    expect(listEntries(db, 't1').map((entry) => entry.id)).toEqual(['e0', 'e1', 'e2']);
    expect(listEntries(db, 't1')[1]?.data).toEqual({ options: ['yes', 'no'] });
  });
});
