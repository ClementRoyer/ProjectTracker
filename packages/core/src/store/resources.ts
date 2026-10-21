import type { DatabaseSync } from 'node:sqlite';
import type { Instant } from '../domain';

export interface ResourceLock {
  ticketId: string;
  leaseUntil: Instant;
}

export function ensureResource(db: DatabaseSync, name: string): void {
  db.prepare('INSERT OR IGNORE INTO resource (name) VALUES (?)').run(name);
}

export function readResourceLock(db: DatabaseSync, name: string): ResourceLock | null {
  const row = db
    .prepare('SELECT ticketId, leaseUntil FROM resourceLock WHERE resource = ?')
    .get(name);
  return row ? { ticketId: String(row.ticketId), leaseUntil: String(row.leaseUntil) } : null;
}

export function saveResourceLock(
  db: DatabaseSync,
  lock: { resource: string; ticketId: string; sessionId: string | null; leaseUntil: Instant },
): void {
  db.prepare(
    `INSERT INTO resourceLock (resource, ticketId, sessionId, leaseUntil) VALUES (?, ?, ?, ?)
     ON CONFLICT (resource) DO UPDATE SET ticketId = excluded.ticketId, sessionId = excluded.sessionId,
       leaseUntil = excluded.leaseUntil`,
  ).run(lock.resource, lock.ticketId, lock.sessionId, lock.leaseUntil);
}

export function deleteResourceLock(db: DatabaseSync, name: string): void {
  db.prepare('DELETE FROM resourceLock WHERE resource = ?').run(name);
}

/** The tickets waiting for the resource, first come first served. */
export function resourceQueue(db: DatabaseSync, name: string): string[] {
  return db
    .prepare('SELECT ticketId FROM resourceQueue WHERE resource = ? ORDER BY queuedAt, rowid')
    .all(name)
    .map((row) => String(row.ticketId));
}

export function enqueueForResource(
  db: DatabaseSync,
  name: string,
  ticketId: string,
  at: Instant,
): void {
  db.prepare(
    'INSERT OR IGNORE INTO resourceQueue (resource, ticketId, queuedAt) VALUES (?, ?, ?)',
  ).run(name, ticketId, at);
}

export function leaveResourceQueue(db: DatabaseSync, name: string, ticketId: string): void {
  db.prepare('DELETE FROM resourceQueue WHERE resource = ? AND ticketId = ?').run(name, ticketId);
}
