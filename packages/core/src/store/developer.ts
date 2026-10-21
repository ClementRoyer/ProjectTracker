import type { DatabaseSync } from 'node:sqlite';

/** When the developer last looked at the novelties (F9); null before the first visit. */
export function readLastVisit(db: DatabaseSync): string | null {
  const row = db.prepare('SELECT lastVisitAt FROM developer LIMIT 1').get();
  return typeof row?.lastVisitAt === 'string' ? row.lastVisitAt : null;
}

export function saveLastVisit(db: DatabaseSync, at: string): void {
  db.exec('DELETE FROM developer');
  db.prepare('INSERT INTO developer (lastVisitAt) VALUES (?)').run(at);
}

/** When the developer last read the ticket (ADR 0029); null if never. */
export function readTicketReadAt(db: DatabaseSync, ticketId: string): string | null {
  const row = db.prepare('SELECT readAt FROM ticketRead WHERE ticketId = ?').get(ticketId);
  return typeof row?.readAt === 'string' ? row.readAt : null;
}

export function saveTicketRead(db: DatabaseSync, ticketId: string, at: string): void {
  db.prepare(
    'INSERT INTO ticketRead (ticketId, readAt) VALUES (?, ?) ON CONFLICT (ticketId) DO UPDATE SET readAt = excluded.readAt',
  ).run(ticketId, at);
}
