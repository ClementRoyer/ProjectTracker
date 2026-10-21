import type { DatabaseSync } from 'node:sqlite';
import type { Instant } from '../domain';

export interface ChangelogLine {
  proposed: string | null;
  proposedAt: Instant | null;
  accepted: string | null;
  acceptedAt: Instant | null;
}

export function readChangelogLine(db: DatabaseSync, ticketId: string): ChangelogLine {
  const row = db.prepare('SELECT * FROM changelogLine WHERE ticketId = ?').get(ticketId);
  const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
  return {
    proposed: text(row?.proposed),
    proposedAt: text(row?.proposedAt),
    accepted: text(row?.accepted),
    acceptedAt: text(row?.acceptedAt),
  };
}

export function saveChangelogLine(
  db: DatabaseSync,
  {
    ticketId,
    which,
    line,
    at,
  }: { ticketId: string; which: 'proposed' | 'accepted'; line: string; at: Instant },
): void {
  const column = which === 'proposed' ? 'proposed' : 'accepted';
  db.prepare(
    `INSERT INTO changelogLine (ticketId, ${column}, ${column}At) VALUES (?, ?, ?)
     ON CONFLICT (ticketId) DO UPDATE SET ${column} = excluded.${column}, ${column}At = excluded.${column}At`,
  ).run(ticketId, line, at);
}
