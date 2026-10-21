import { describe, expect, it } from 'vitest';
import { comparePriority, priorityFromFiveLevels } from '../../src/domain';

describe('ticket priority (ADR 0032)', () => {
  it('puts the more urgent ticket first', () => {
    expect((['low', 'urgent', 'normal', 'high'] as const).toSorted(comparePriority)).toEqual([
      'urgent',
      'high',
      'normal',
      'low',
    ]);
  });

  it('converts the five levels of Jira and V1 to the four of the tool', () => {
    expect(['Highest', 'High', 'Medium', 'Low', 'Lowest'].map(priorityFromFiveLevels)).toEqual([
      'urgent',
      'high',
      'normal',
      'low',
      'low',
    ]);
  });

  it('takes an unknown or missing priority as normal', () => {
    expect([priorityFromFiveLevels('Blocker'), priorityFromFiveLevels(undefined)]).toEqual([
      'normal',
      'normal',
    ]);
  });
});
