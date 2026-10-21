import { describe, expect, it } from 'vitest';
import { estimateCost, periodKey, summarizeUsage, type UsageRecord } from '../../src/domain';

const prices = {
  'model-a': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

const record = (overrides: Partial<UsageRecord>): UsageRecord => ({
  model: 'model-a',
  inputTokens: 1_000_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  provenance: 'measured',
  at: '2026-10-19T09:00:00.000Z',
  ...overrides,
});

describe('usage', () => {
  it('estimates the cost from the price table, per million tokens', () => {
    expect(estimateCost(record({ outputTokens: 100_000 }), prices)).toBeCloseTo(4.5);
  });

  it('gives no cost for a model missing from the price table', () => {
    expect(estimateCost(record({ model: 'unknown' }), prices)).toBeNull();
  });

  it('groups by day, week and month in the developer time zone', () => {
    const at = '2026-10-19T23:30:00.000Z';
    expect(periodKey(at, 'day', 'Europe/Paris')).toBe('2026-10-20');
    expect(periodKey(at, 'week', 'Europe/Paris')).toBe('2026-W43');
    expect(periodKey(at, 'month', 'Europe/Paris')).toBe('2026-10');
  });

  it('starts the week on Monday at local midnight', () => {
    expect(periodKey('2026-10-25T23:30:00.000Z', 'week', 'Europe/Paris')).toBe('2026-W44');
    expect(periodKey('2026-10-25T23:30:00.000Z', 'week', 'UTC')).toBe('2026-W43');
  });

  it('starts the month at local midnight', () => {
    expect(periodKey('2026-10-31T23:30:00.000Z', 'month', 'Europe/Paris')).toBe('2026-11');
  });

  it('puts the first days of January in the last ISO week of the year before when needed', () => {
    expect(periodKey('2027-01-01T12:00:00.000Z', 'week', 'Europe/Paris')).toBe('2026-W53');
  });

  it('keeps measured and declared tokens apart, and counts unpriced tokens', () => {
    const summary = summarizeUsage(
      [
        record({}),
        record({ provenance: 'declared', inputTokens: 500 }),
        record({ model: 'unknown', inputTokens: 200 }),
      ],
      prices,
      'day',
      'Europe/Paris',
    );
    expect(summary).toEqual([
      {
        period: '2026-10-19',
        measuredTokens: 1_000_200,
        declaredTokens: 500,
        unpricedTokens: 200,
        estimatedCost: 3.0015,
      },
    ]);
  });
});
