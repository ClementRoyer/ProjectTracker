import type { Instant } from './time';

/** The last start or end an agent signalled on the ticket. */
export interface WorkSignal {
  state: 'started' | 'finished';
  at: Instant;
}

export interface WorkFacts {
  signal: WorkSignal | null;
  /** The last entry an agent wrote; a question or an end-of-turn reply ends its turn. */
  lastAgentEntry: { at: Instant; endsTurn: boolean } | null;
  executionRunning: boolean;
  now: Instant;
  /** Silence after which a write no longer counts as work. */
  deducedTimeoutMs: number;
  /** Silence after which a signalled start is forgotten (the agent stopped without saying). */
  signalledTimeoutMs: number;
}

/** Signalled by the agent, else deduced from what it writes (ADR 0028). */
export function isWorking(facts: WorkFacts): boolean {
  if (facts.executionRunning) return true;
  const { signal, lastAgentEntry } = facts;
  const silenceSince = (at: Instant): number => Date.parse(facts.now) - Date.parse(at);
  if (signal?.state === 'started') {
    const latest =
      lastAgentEntry !== null && lastAgentEntry.at > signal.at ? lastAgentEntry.at : signal.at;
    return silenceSince(latest) < facts.signalledTimeoutMs;
  }
  if (lastAgentEntry === null) return false;
  if (signal !== null && lastAgentEntry.at <= signal.at) return false;
  return !lastAgentEntry.endsTurn && silenceSince(lastAgentEntry.at) < facts.deducedTimeoutMs;
}
