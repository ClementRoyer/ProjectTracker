import type { TicketSummary } from '@project-tracker/contract';

/** Open tickets whose tests are done: ready for the next QA delivery. */
export function deliveryCandidates(tickets: readonly TicketSummary[]): TicketSummary[] {
  return tickets.filter(
    ({ situation }) =>
      situation.closedAt === null &&
      situation.phase === 'test' &&
      situation.progress.state === 'done',
  );
}

export function recentlyClosed(tickets: readonly TicketSummary[]): TicketSummary[] {
  return tickets
    .filter((ticket) => ticket.situation.closedAt !== null)
    .sort((a, b) => (b.situation.closedAt ?? '').localeCompare(a.situation.closedAt ?? ''));
}

export type Period = 'day' | 'week' | 'month';

/** "Today", "Week 43", "October 2026", from the keys the server gives. */
export function periodLabel(period: Period, key: string): string {
  if (period === 'day') return 'Today';
  if (period === 'week') return `Week ${String(Number(key.slice(-2)))}`;
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T12:00:00Z`));
  return month.charAt(0).toUpperCase() + month.slice(1);
}

const DAY_MS = 86_400_000;

/** The seven days up to `today` (YYYY-MM-DD), each with its tokens. */
export function lastDays(
  days: readonly { period: string; tokens: number }[],
  today: string,
): { key: string; label: string; tokens: number }[] {
  const end = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end - (6 - index) * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
      date,
    );
    return { key, label, tokens: days.find((day) => day.period === key)?.tokens ?? 0 };
  });
}
