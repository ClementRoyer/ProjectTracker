/** The four levels, most urgent first (ADR 0032). */
export const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const DEFAULT_PRIORITY: Priority = 'normal';

/** For sorting: the more urgent first. */
export function comparePriority(a: Priority, b: Priority): number {
  return PRIORITIES.indexOf(a) - PRIORITIES.indexOf(b);
}

const FIVE_LEVELS: Readonly<Record<string, Priority>> = {
  Highest: 'urgent',
  High: 'high',
  Medium: 'normal',
  Low: 'low',
  Lowest: 'low',
};

/** Jira's and V1's scale; a custom or missing name is normal. */
export function priorityFromFiveLevels(name: string | undefined): Priority {
  return (name === undefined ? undefined : FIVE_LEVELS[name]) ?? DEFAULT_PRIORITY;
}
