import { describe, expect, it } from 'vitest';
import { suggestNext, type SuggestionCandidate } from '../../src/domain';

const TODAY = '2026-10-20';

const candidate = (
  key: string,
  overrides: Partial<SuggestionCandidate> = {},
): SuggestionCandidate => ({
  key,
  priority: 'normal',
  phase: 'development',
  dueDate: null,
  size: null,
  ...overrides,
});

describe('what to take next (F21, ADR 0038)', () => {
  it('ranks an overdue ticket above an urgent one, and gives the reasons', () => {
    const suggestions = suggestNext(
      [candidate('A-1', { priority: 'urgent' }), candidate('A-2', { dueDate: '2026-10-18' })],
      TODAY,
    );
    expect(suggestions).toEqual([
      { key: 'A-2', reasons: ['échéance dépassée'] },
      { key: 'A-1', reasons: ['priorité urgente'] },
    ]);
  });

  it('adds up the reasons of a ticket', () => {
    const [first] = suggestNext(
      [candidate('B-1', { phase: 'test', size: 'small', dueDate: '2026-10-22' })],
      TODAY,
    );
    expect(first?.reasons).toEqual(['échéance dans 2 j', 'presque fini', 'gain rapide']);
  });

  it('leaves out a ticket with no reason, and keeps three at most', () => {
    const tickets = [
      candidate('C-1'),
      ...['C-2', 'C-3', 'C-4', 'C-5'].map((key) => candidate(key, { priority: 'high' })),
    ];
    const keys = suggestNext(tickets, TODAY).map((suggestion) => suggestion.key);
    expect(keys).toHaveLength(3);
    expect(keys).not.toContain('C-1');
  });

  it('counts a far due date only within a week', () => {
    expect(suggestNext([candidate('D-1', { dueDate: '2026-11-30' })], TODAY)).toEqual([]);
    expect(suggestNext([candidate('D-2', { dueDate: '2026-10-26' })], TODAY)[0]?.reasons).toEqual([
      'échéance dans 6 j',
    ]);
  });
});
