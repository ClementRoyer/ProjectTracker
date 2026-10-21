import type { Novelty } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { groupNovelties } from '../src/lib/novelties';

const novelty = (key: string, createdAt: string): Novelty => ({
  id: `${key}-${createdAt}`,
  entryType: 'progress',
  authorKind: 'agent',
  author: 'front-1',
  role: 'front',
  body: 'Done.',
  data: null,
  replyTo: null,
  acknowledgedAt: null,
  createdAt,
  key,
  title: `Ticket ${key}`,
});

describe('the novelties screen (F9, ADR 0034)', () => {
  it('groups the novelties by ticket, the ticket with the latest news first, its news newest first', () => {
    const groups = groupNovelties([
      novelty('A-1', '2026-10-20T08:00:00Z'),
      novelty('B-1', '2026-10-20T09:00:00Z'),
      novelty('A-1', '2026-10-20T10:00:00Z'),
    ]);
    expect(
      groups.map((group) => [group.key, group.entries.map((entry) => entry.createdAt)]),
    ).toEqual([
      ['A-1', ['2026-10-20T10:00:00Z', '2026-10-20T08:00:00Z']],
      ['B-1', ['2026-10-20T09:00:00Z']],
    ]);
  });
});
