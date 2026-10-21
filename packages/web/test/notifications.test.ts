import type { Novelty, WaitingItem } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { firstSeen, newNotices, tabTitle } from '../src/lib/notifications';

const question = (id: string): WaitingItem => ({
  kind: 'question',
  questionId: id,
  key: 'LOC-1',
  title: 'Search by name',
  since: '2026-10-20T09:00:00Z',
  text: `Question ${id}?`,
  question: null,
});

const reply = (id: string, authorKind: Novelty['authorKind'] = 'launcher'): Novelty => ({
  id,
  entryType: 'progress',
  authorKind,
  author: null,
  role: 'backend',
  body: 'Route added.',
  data: null,
  replyTo: null,
  acknowledgedAt: null,
  createdAt: '2026-10-20T09:00:00Z',
  key: 'LOC-2',
  title: 'Export orders',
});

describe('notifications (F26, ADR 0036)', () => {
  it('stays quiet about what was already there when the page opened', () => {
    const seen = firstSeen([question('q1')], [reply('r1')]);
    expect(newNotices(seen, [question('q1')], [reply('r1')]).notices).toEqual([]);
  });

  it('tells a new question and a new back-end reply, once each', () => {
    const seen = firstSeen([], []);
    const first = newNotices(seen, [question('q2')], [reply('r2')]);
    expect(first.notices.map((notice) => [notice.title, notice.key])).toEqual([
      ['Question pour toi', 'LOC-1'],
      ['Réponse du back-end', 'LOC-2'],
    ]);
    expect(newNotices(first.seen, [question('q2')], [reply('r2')]).notices).toEqual([]);
  });

  it('does not tell what an agent of the front writes', () => {
    const seen = firstSeen([], []);
    expect(newNotices(seen, [], [reply('r3', 'agent')]).notices).toEqual([]);
  });

  it('puts the number of decisions waiting in the tab title', () => {
    expect([tabTitle(0), tabTitle(3)]).toEqual(['project-tracker', '(3) project-tracker']);
  });
});
