import type { Situation } from './situation';
import type { Instant } from './time';

export interface StaleCheck {
  lastActivityAt: Instant;
  now: Instant;
  thresholdMs: number;
}

/** A ticket in progress with no news for longer than the configured threshold. */
export function isStale(situation: Situation, check: StaleCheck): boolean {
  if (situation.closedAt !== undefined) return false;
  if (situation.progress.state !== 'inProgress') return false;
  return Date.parse(check.now) - Date.parse(check.lastActivityAt) >= check.thresholdMs;
}
