import { describe, expect, it } from 'vitest';
import { isWorking, type WorkFacts } from '../../src/domain';

const MINUTE = 60_000;
const NOW = '2026-10-20T10:00:00.000Z';
const minutesAgo = (minutes: number): string =>
  new Date(Date.parse(NOW) - minutes * MINUTE).toISOString();

const facts = (overrides: Partial<WorkFacts>): WorkFacts => ({
  signal: null,
  lastAgentEntry: null,
  executionRunning: false,
  now: NOW,
  deducedTimeoutMs: 15 * MINUTE,
  signalledTimeoutMs: 60 * MINUTE,
  ...overrides,
});

describe('an agent works on the ticket (ADR 0028)', () => {
  it('works while a back-end execution runs', () => {
    expect(isWorking(facts({ executionRunning: true }))).toBe(true);
  });

  it('works from the start the agent signals, even without writing anything', () => {
    expect(isWorking(facts({ signal: { state: 'started', at: minutesAgo(40) } }))).toBe(true);
  });

  it('stops at the end the agent signals', () => {
    const signal = { state: 'finished' as const, at: minutesAgo(1) };
    const lastAgentEntry = { at: minutesAgo(2), endsTurn: false };
    expect(isWorking(facts({ signal, lastAgentEntry }))).toBe(false);
  });

  it('forgets a signalled start after a long silence, since the agent may have stopped without saying', () => {
    expect(isWorking(facts({ signal: { state: 'started', at: minutesAgo(61) } }))).toBe(false);
  });

  it('keeps a signalled start alive while the agent writes on the ticket', () => {
    const signal = { state: 'started' as const, at: minutesAgo(90) };
    const lastAgentEntry = { at: minutesAgo(5), endsTurn: false };
    expect(isWorking(facts({ signal, lastAgentEntry }))).toBe(true);
  });

  it('deduces work from a recent write when the agent signals nothing', () => {
    const lastAgentEntry = { at: minutesAgo(5), endsTurn: false };
    expect(isWorking(facts({ lastAgentEntry }))).toBe(true);
  });

  it('deduces the end after the configured silence', () => {
    const lastAgentEntry = { at: minutesAgo(16), endsTurn: false };
    expect(isWorking(facts({ lastAgentEntry }))).toBe(false);
  });

  it('deduces the end from a question or an end-of-turn reply', () => {
    const lastAgentEntry = { at: minutesAgo(1), endsTurn: true };
    expect(isWorking(facts({ lastAgentEntry }))).toBe(false);
  });

  it('deduces again from a write that comes after a signalled end', () => {
    const signal = { state: 'finished' as const, at: minutesAgo(10) };
    const lastAgentEntry = { at: minutesAgo(2), endsTurn: false };
    expect(isWorking(facts({ signal, lastAgentEntry }))).toBe(true);
  });

  it('does not work when nothing happened', () => {
    expect(isWorking(facts({}))).toBe(false);
  });
});
