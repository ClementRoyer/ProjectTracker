import type { Instant } from './time';

export interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  provenance: 'measured' | 'declared';
  at: Instant;
}

/** Prices per million tokens, from the configuration (ADR 0012). */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type PriceTable = Readonly<Record<string, ModelPrice>>;

export type Period = 'day' | 'week' | 'month';

export interface UsageSummary {
  period: string;
  measuredTokens: number;
  declaredTokens: number;
  unpricedTokens: number;
  estimatedCost: number;
}

const PER_MILLION = 1_000_000;

export function estimateCost(record: UsageRecord, prices: PriceTable): number | null {
  const price = prices[record.model];
  if (!price) return null;
  return (
    (record.inputTokens * price.input +
      record.outputTokens * price.output +
      record.cacheReadTokens * price.cacheRead +
      record.cacheWriteTokens * price.cacheWrite) /
    PER_MILLION
  );
}

/** IANA time zone of the developer, from the configuration: periods follow their local midnight. */
export type TimeZone = string;

export function periodKey(at: Instant, period: Period, timeZone: TimeZone): string {
  const day = localDay(at, timeZone);
  if (period === 'day') return day;
  if (period === 'month') return day.slice(0, 7);
  return isoWeek(new Date(`${day}T00:00:00.000Z`));
}

export function summarizeUsage(
  records: readonly UsageRecord[],
  prices: PriceTable,
  period: Period,
  timeZone: TimeZone,
): UsageSummary[] {
  const byPeriod = new Map<string, UsageSummary>();
  for (const record of records) {
    const key = periodKey(record.at, period, timeZone);
    const summary = byPeriod.get(key) ?? emptySummary(key);
    const tokens = totalTokens(record);
    if (record.provenance === 'measured') summary.measuredTokens += tokens;
    else summary.declaredTokens += tokens;
    const cost = estimateCost(record, prices);
    if (cost === null) summary.unpricedTokens += tokens;
    else summary.estimatedCost += cost;
    byPeriod.set(key, summary);
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}

function totalTokens(record: UsageRecord): number {
  return (
    record.inputTokens + record.outputTokens + record.cacheReadTokens + record.cacheWriteTokens
  );
}

function emptySummary(period: string): UsageSummary {
  return { period, measuredTokens: 0, declaredTokens: 0, unpricedTokens: 0, estimatedCost: 0 };
}

/** The calendar day (YYYY-MM-DD) of an instant in a time zone; the en-CA format is already YYYY-MM-DD. */
function localDay(at: Instant, timeZone: TimeZone): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
}

/** ISO 8601 week: weeks start on Monday, and a week belongs to the year of its Thursday. */
function isoWeek(date: Date): string {
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const dayOfYear = (thursday.getTime() - Date.UTC(year, 0, 1)) / 86_400_000;
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${String(year)}-W${String(week).padStart(2, '0')}`;
}
