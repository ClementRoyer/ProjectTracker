import type { TicketSummary } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { deliveryCandidates, lastDays, periodLabel, recentlyClosed } from '../src/lib/summary';

const ticket = (key: string, situation: Partial<TicketSummary['situation']>): TicketSummary => ({
  key,
  title: key,
  origin: 'local',
  priority: 'normal',
  dueDate: null,
  group: null,
  size: null,
  jiraStatus: null,
  situation: {
    phase: 'development',
    progress: { state: 'notStarted' },
    wait: null,
    closedAt: null,
    ...situation,
  },
  lastActivityAt: '2026-10-20T09:00:00.000Z',
  stale: false,
  unread: false,
  overlaps: [],
  assignees: [],
  working: false,
  readyToClose: false,
});

describe('the summary screen (validated mockup)', () => {
  it('offers for the next QA delivery the open tickets whose tests are done', () => {
    const tickets = [
      ticket('A-1', { phase: 'test', progress: { state: 'done' } }),
      ticket('A-2', { phase: 'test', progress: { state: 'inProgress', note: '14/16' } }),
      ticket('A-3', {
        phase: 'test',
        progress: { state: 'done' },
        closedAt: '2026-10-19T09:00:00Z',
      }),
    ];
    expect(deliveryCandidates(tickets).map((t) => t.key)).toEqual(['A-1']);
  });

  it('lists the closed tickets, last closed first', () => {
    const tickets = [
      ticket('B-1', { closedAt: '2026-10-10T09:00:00Z' }),
      ticket('B-2', { closedAt: '2026-10-12T09:00:00Z' }),
      ticket('B-3', {}),
    ];
    expect(recentlyClosed(tickets).map((t) => t.key)).toEqual(['B-2', 'B-1']);
  });

  it('names the current period in words', () => {
    expect([
      periodLabel('day', '2026-10-20'),
      periodLabel('week', '2026-W43'),
      periodLabel('month', '2026-10'),
    ]).toEqual(['Today', 'Week 43', 'October 2026']);
  });

  it('gives the seven days up to today, with zero for a day without usage', () => {
    const days = lastDays([{ period: '2026-10-19', tokens: 5 }], '2026-10-20');
    expect(days.map((day) => [day.key, day.tokens])).toEqual([
      ['2026-10-14', 0],
      ['2026-10-15', 0],
      ['2026-10-16', 0],
      ['2026-10-17', 0],
      ['2026-10-18', 0],
      ['2026-10-19', 5],
      ['2026-10-20', 0],
    ]);
  });
});
