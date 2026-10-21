import { backup, DatabaseSync } from 'node:sqlite';
import { initialSchema } from './migrations/0001-initial-schema';
import { workSignal } from './migrations/0002-work-signal';
import { ticketRead } from './migrations/0003-ticket-read';
import { ticketPriority } from './migrations/0004-ticket-priority';
import { changelogLine } from './migrations/0005-changelog-line';
import { dueDateAndSize } from './migrations/0006-due-date-and-size';

/** Numbered migrations (ADR 0023): index + 1 is the schema version kept in PRAGMA user_version. */
export const MIGRATIONS: readonly string[] = [
  initialSchema,
  workSignal,
  ticketRead,
  ticketPriority,
  changelogLine,
  dueDateAndSize,
];

const BUSY_TIMEOUT_MS = 5000;

export function openDatabase(location: string): DatabaseSync {
  const db = new DatabaseSync(location);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = ${String(BUSY_TIMEOUT_MS)};`);
  if (location !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

export function migrate(db: DatabaseSync): void {
  const current = Number(db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
  MIGRATIONS.slice(current).forEach((sql, index) => {
    inTransaction(db, () => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${String(current + index + 1)}`);
    });
  });
}

/** Runs the steps as one transaction: all are written, or none. Inside a running transaction, joins it. */
export function inTransaction<T>(db: DatabaseSync, steps: () => T): T {
  if (db.isTransaction) return steps();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = steps();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** A consistent copy taken while the server keeps the database open (ADR 0013). */
export async function backupDatabase(db: DatabaseSync, destination: string): Promise<void> {
  await backup(db, destination);
}
