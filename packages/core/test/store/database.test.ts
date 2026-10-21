import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { backupDatabase, inTransaction, migrate, MIGRATIONS, openDatabase } from '../../src/store';

const TABLES = [
  'agent',
  'assignment',
  'attachment',
  'backendRequest',
  'changedFile',
  'changelogLine',
  'delivery',
  'deliveryBatch',
  'deliveryBatchTicket',
  'developer',
  'document',
  'entry',
  'execution',
  'fileHold',
  'group',
  'jiraImport',
  'launcher',
  'preview',
  'question',
  'resource',
  'resourceLock',
  'resourceQueue',
  'session',
  'situation',
  'testRun',
  'ticket',
  'ticketRead',
  'usage',
  'worktree',
];

const tableNames = (db: DatabaseSync): string[] =>
  db
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => String(row.name));

const userVersion = (db: DatabaseSync): number =>
  Number(db.prepare('PRAGMA user_version').get()?.user_version);

const addTicket = (db: DatabaseSync, id: string): void => {
  db.prepare(
    "INSERT INTO ticket (id, key, origin, title, createdAt) VALUES (?, ?, 'local', 'A ticket', '2026-10-19T09:00:00.000Z')",
  ).run(id, id.toUpperCase());
};

const addEntry = (db: DatabaseSync, id: string, ticketId: string): void => {
  db.prepare(
    "INSERT INTO entry (id, ticketId, entryType, authorKind, body, createdAt) VALUES (?, ?, 'progress', 'developer', 'Some text', '2026-10-19T09:00:00.000Z')",
  ).run(id, ticketId);
};

const addAssignment = (db: DatabaseSync, ticketId: string, releasedAt: string | null): void => {
  db.prepare(
    "INSERT INTO assignment (ticketId, role, assigneeKind, since, releasedAt) VALUES (?, 'front', 'developer', '2026-10-19T09:00:00.000Z', ?)",
  ).run(ticketId, releasedAt);
};

const temporaryFolders: string[] = [];
const temporaryFolder = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'tracker-store-'));
  temporaryFolders.push(folder);
  return folder;
};

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe('database', () => {
  it('creates every table of the data model (ADR 0015)', () => {
    expect(tableNames(openDatabase(':memory:'))).toEqual(TABLES);
  });

  it('records the schema version and applies each migration only once', () => {
    const db = openDatabase(':memory:');
    migrate(db);
    expect(userVersion(db)).toBe(MIGRATIONS.length);
  });

  it('refuses to change a journal entry, since the journal is immutable', () => {
    const db = openDatabase(':memory:');
    addTicket(db, 't1');
    addEntry(db, 'e1', 't1');
    expect(() => db.prepare("UPDATE entry SET body = 'changed' WHERE id = 'e1'").run()).toThrow(
      /immutable/,
    );
  });

  it('refuses to delete a journal entry, since the journal is immutable', () => {
    const db = openDatabase(':memory:');
    addTicket(db, 't1');
    addEntry(db, 'e1', 't1');
    expect(() => db.prepare("DELETE FROM entry WHERE id = 'e1'").run()).toThrow(/immutable/);
  });

  it('allows a single active assignee per role on a ticket', () => {
    const db = openDatabase(':memory:');
    addTicket(db, 't1');
    addAssignment(db, 't1', '2026-10-19T10:00:00.000Z');
    addAssignment(db, 't1', null);
    expect(() => {
      addAssignment(db, 't1', null);
    }).toThrow(/UNIQUE/);
  });

  it('refuses a row that points to a missing ticket', () => {
    const db = openDatabase(':memory:');
    expect(() => {
      addEntry(db, 'e1', 'missing');
    }).toThrow(/FOREIGN KEY/);
  });

  it('writes nothing when a step of a transaction fails', () => {
    const db = openDatabase(':memory:');
    expect(() => {
      inTransaction(db, () => {
        addTicket(db, 't1');
        addEntry(db, 'e1', 'missing');
      });
    }).toThrow();
    expect(db.prepare('SELECT count(*) AS n FROM ticket').get()?.n).toBe(0);
  });

  it('joins the running transaction, so that a failure inside undoes everything', () => {
    const db = openDatabase(':memory:');
    expect(() => {
      inTransaction(db, () => {
        addTicket(db, 't1');
        inTransaction(db, () => {
          addEntry(db, 'e1', 'missing');
        });
      });
    }).toThrow();
    expect(db.prepare('SELECT count(*) AS n FROM ticket').get()?.n).toBe(0);
  });

  it('backs up a copy that opens on its own, while the database stays open', async () => {
    const folder = temporaryFolder();
    const db = openDatabase(join(folder, 'tracker.db'));
    addTicket(db, 't1');
    const copy = join(folder, 'backup.db');
    await backupDatabase(db, copy);
    const restored = openDatabase(copy);
    expect(restored.prepare('SELECT key FROM ticket').get()?.key).toBe('T1');
    restored.close();
    db.close();
  });
});
