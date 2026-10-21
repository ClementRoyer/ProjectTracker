import type { TicketSummary } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { groupTickets, progressText, sortTickets, waitText } from '../src/lib/pilotage';
import { ago } from '../src/lib/format';

const NOW = '2026-10-20T10:00:00.000Z';
const hoursAgo = (hours: number): string =>
  new Date(Date.parse(NOW) - hours * 3_600_000).toISOString();

const ticket = (key: string, overrides: Partial<TicketSummary> = {}): TicketSummary => ({
  key,
  title: `Ticket ${key}`,
  origin: 'local',
  priority: 'normal',
  dueDate: null,
  group: null,
  size: null,
  jiraStatus: null,
  situation: {
    phase: 'development',
    progress: { state: 'inProgress', note: 'form done' },
    wait: null,
    closedAt: null,
  },
  lastActivityAt: hoursAgo(1),
  stale: false,
  unread: false,
  overlaps: [],
  assignees: [{ role: 'front', kind: 'agent', name: 'front-1' }],
  working: false,
  readyToClose: false,
  ...overrides,
});

const waiting = (kind: 'developer' | 'backend', since: string): TicketSummary['situation'] => ({
  phase: 'development',
  progress: { state: 'inProgress', note: 'form done' },
  wait: { kind, since },
  closedAt: null,
});

const groupKeys = (tickets: TicketSummary[]): Record<string, string[]> =>
  Object.fromEntries(
    groupTickets(tickets).map((group) => [group.id, group.tickets.map((t) => t.key)]),
  );

describe('the list groups tickets by who must act (validated mockup)', () => {
  it('puts first what waits for the developer: a question, or a ticket to declare done', () => {
    const groups = groupKeys([
      ticket('A-1', { working: true }),
      ticket('A-2', { situation: waiting('developer', hoursAgo(5)) }),
      ticket('A-3', { readyToClose: true }),
    ]);
    expect(Object.keys(groups)[0]).toBe('me');
    expect(groups.me).toEqual(['A-2', 'A-3']);
  });

  it('separates what waits for someone else, what has no news, and what nobody took', () => {
    const groups = groupKeys([
      ticket('B-1', { situation: waiting('backend', hoursAgo(2)) }),
      ticket('B-2', { stale: true }),
      ticket('B-3', {
        assignees: [],
        situation: { phase: 'todo', progress: { state: 'notStarted' }, wait: null, closedAt: null },
      }),
      ticket('B-4', { working: true }),
    ]);
    expect(groups).toEqual({ agent: ['B-4'], other: ['B-1'], stale: ['B-2'], none: ['B-3'] });
  });

  it('keeps closed tickets apart, at the end', () => {
    const closed = ticket('C-1', {
      situation: {
        phase: 'qaValidation',
        progress: { state: 'done' },
        wait: null,
        closedAt: hoursAgo(3),
      },
    });
    const groups = groupTickets([closed, ticket('C-2')]);
    expect(groups.at(-1)?.id).toBe('done');
  });

  it('leaves out the groups that are empty', () => {
    expect(groupTickets([ticket('D-1')]).map((group) => group.id)).toEqual(['agent']);
  });
});

describe('sorting the list', () => {
  it('sorts by the oldest wait first, so what has waited longest comes on top', () => {
    const tickets = [
      ticket('E-1', { situation: waiting('developer', hoursAgo(1)) }),
      ticket('E-2', { situation: waiting('developer', hoursAgo(9)) }),
    ];
    expect(sortTickets(tickets, 'wait').map((t) => t.key)).toEqual(['E-2', 'E-1']);
  });

  it('sorts by priority, the most urgent first', () => {
    const tickets = [
      ticket('P-1', { priority: 'low' }),
      ticket('P-2', { priority: 'urgent' }),
      ticket('P-3'),
    ];
    expect(sortTickets(tickets, 'priority').map((t) => t.key)).toEqual(['P-2', 'P-3', 'P-1']);
  });

  it('sorts by key in natural order', () => {
    const keys = sortTickets([ticket('LOC-10'), ticket('LOC-9')], 'key').map((t) => t.key);
    expect(keys).toEqual(['LOC-9', 'LOC-10']);
  });
});

describe('texts of a row', () => {
  it('says how long the developer has been waited for', () => {
    expect(waitText(ticket('F-1', { situation: waiting('developer', hoursAgo(50)) }), NOW)).toBe(
      'Waiting for your answer for 2 d',
    );
  });

  it('says "less than a minute" rather than "for now"', () => {
    expect(waitText(ticket('F-4', { situation: waiting('backend', NOW) }), NOW)).toBe(
      'Waiting for the back-end for less than a minute',
    );
  });

  it('names the agent at work', () => {
    expect(waitText(ticket('F-2', { working: true }), NOW)).toBe('front-1 is working');
  });

  it('says the progress in words', () => {
    expect(progressText(ticket('F-3'))).toBe('In progress: form done');
  });

  it('writes short durations', () => {
    expect([ago(hoursAgo(0), NOW), ago(hoursAgo(0.2), NOW), ago(hoursAgo(3), NOW)]).toEqual([
      'now',
      '12 min',
      '3 h',
    ]);
  });
});
