import { describe, expect, it } from 'vitest';
import { isStale, type Situation } from '../../src/domain';

const DAY = 24 * 60 * 60 * 1000;
const working: Situation = { phase: 'development', progress: { state: 'inProgress', note: 'API' } };

describe('stale ticket', () => {
  it('flags a ticket in progress with no news for longer than the threshold', () => {
    expect(
      isStale(working, {
        lastActivityAt: '2026-10-15T09:00:00.000Z',
        now: '2026-10-19T09:00:00.000Z',
        thresholdMs: 3 * DAY,
      }),
    ).toBe(true);
  });

  it('does not flag a ticket that moved recently', () => {
    expect(
      isStale(working, {
        lastActivityAt: '2026-10-18T09:00:00.000Z',
        now: '2026-10-19T09:00:00.000Z',
        thresholdMs: 3 * DAY,
      }),
    ).toBe(false);
  });

  it('only flags tickets in progress', () => {
    const notStarted: Situation = { phase: 'todo', progress: { state: 'notStarted' } };
    expect(
      isStale(notStarted, {
        lastActivityAt: '2026-01-01T09:00:00.000Z',
        now: '2026-10-19T09:00:00.000Z',
        thresholdMs: DAY,
      }),
    ).toBe(false);
  });
});
