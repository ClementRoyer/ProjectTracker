import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { listEntries, openDatabase, readSituation } from '@project-tracker/core/store';
import { migrateV1Project } from '../../src';

const FIXTURE = join(import.meta.dirname, '../../../../legacy/scripts/test/fixtures/tracker');

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** A writable copy of the V1 schema 4 fixture, and where the V2 database goes. */
const setUp = (): { tracker: string; database: string } => {
  const folder = mkdtempSync(join(tmpdir(), 'tracker-migration-'));
  folders.push(folder);
  const tracker = join(folder, 'v1');
  cpSync(FIXTURE, tracker, { recursive: true });
  return { tracker, database: join(folder, 'v2', 'tracker.db') };
};

const migrateDemo = (): { db: DatabaseSync; database: string; tracker: string } => {
  const { tracker, database } = setUp();
  migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
  return { db: openDatabase(database), database, tracker };
};

const column = (db: DatabaseSync, sql: string): unknown[] =>
  db
    .prepare(sql)
    .all()
    .map((row) => Object.values(row)[0]);

const editItem = (tracker: string, key: string, change: Record<string, unknown>): void => {
  const file = join(tracker, 'projects/demo/tickets', key, 'item.json');
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), ...change }));
};

/** A hash of every file under the folder, to prove the migration changed nothing. */
const fingerprint = (folder: string): string => {
  const hash = createHash('sha1');
  for (const file of readdirSync(folder, { recursive: true, encoding: 'utf8' }).sort()) {
    const path = join(folder, file);
    if (statSync(path).isFile()) hash.update(file).update(readFileSync(path));
  }
  return hash.digest('hex');
};

// The V1 data lives in legacy/, which the public branch leaves out (ADR 0047).
describe.skipIf(!existsSync(FIXTURE))('V1 migration', () => {
  it('migrates every card of the project and leaves out the tasks, a notion V2 dropped', () => {
    const { tracker, database } = setUp();
    const report = migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    const db = openDatabase(database);
    expect(column(db, 'SELECT key FROM ticket ORDER BY key')).toEqual([
      'DEMO-1',
      'DEMO-2',
      'DEMO-3',
      'RELEASE-NOTES',
    ]);
    expect(report.skipped.task).toBe(1);
  });

  it('migrates each V1 project into its own database', () => {
    const { tracker, database } = setUp();
    migrateV1Project({ trackerFolder: tracker, projectId: 'shop', database });
    const db = openDatabase(database);
    expect(column(db, 'SELECT key FROM ticket ORDER BY key')).toEqual(['SHOP-1', 'SHOP-2']);
    expect(listEntries(db, 'SHOP-2').map((entry) => entry.entryType)).toEqual([
      'question',
      'answer',
    ]);
  });

  it('converts the V1 priority to the four levels, normal when it had none (ADR 0032)', () => {
    const { db } = migrateDemo();
    expect(
      column(db, "SELECT priority FROM ticket WHERE key IN ('DEMO-1', 'DEMO-2') ORDER BY key"),
    ).toEqual(['high', 'normal']);
  });

  it('puts every unfinished ticket in « À faire », not started', () => {
    const { db } = migrateDemo();
    expect(readSituation(db, 'DEMO-2')?.situation).toEqual({
      phase: 'todo',
      progress: { state: 'notStarted' },
    });
  });

  it('closes a finished ticket at its end date, after a done QA validation', () => {
    const { tracker, database } = setUp();
    editItem(tracker, 'DEMO-3', { stage: 'done', doneAt: '2026-10-13T08:00:00.000Z' });
    migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    expect(readSituation(openDatabase(database), 'DEMO-3')?.situation).toEqual({
      phase: 'qaValidation',
      progress: { state: 'done' },
      closedAt: '2026-10-13T08:00:00.000Z',
    });
  });

  it('keeps what a ticket waits for: the developer, or a partner by its label', () => {
    const { db } = migrateDemo();
    expect(readSituation(db, 'DEMO-1')?.wait).toEqual({
      kind: 'developer',
      since: '2026-10-12T09:00:00.000Z',
    });
    expect(readSituation(db, 'DEMO-2')?.wait).toEqual({
      kind: 'partner',
      since: '2026-10-12T10:00:00.000Z',
      detail: 'API team',
    });
  });

  it('keeps the request and its origin as the initial request', () => {
    const { db } = migrateDemo();
    expect(column(db, "SELECT initialRequest FROM ticket WHERE key = 'DEMO-1'")[0]).toBe(
      'Product owner, 2026-10-01\n\nFind a customer by name from the home screen.',
    );
  });

  it('links each answer to its question, which becomes answered', () => {
    const { db } = migrateDemo();
    const answers = listEntries(db, 'DEMO-1').filter((entry) => entry.entryType === 'answer');
    expect(answers.map((answer) => [answer.replyTo, answer.body])).toEqual([
      ['DEMO-1/Q1', 'Oui'],
      ['DEMO-1/Q2', 'Start of each word\n\nKeep it simple for the first version.'],
    ]);
    expect(column(db, "SELECT status FROM question WHERE ticketId = 'DEMO-1'")).toEqual([
      'answered',
      'answered',
    ]);
  });

  it('leaves out an answer the developer retracted', () => {
    const { db } = migrateDemo();
    const bodies = listEntries(db, 'DEMO-1').map((entry) => entry.body);
    expect(bodies.some((body) => body.includes('Typo'))).toBe(false);
  });

  it('turns messages, history and decisions into journal entries, in time order', () => {
    const { db } = migrateDemo();
    expect(listEntries(db, 'DEMO-1').map((entry) => entry.entryType)).toEqual([
      'progress',
      'question',
      'answer',
      'decision',
      'progress',
      'question',
      'answer',
    ]);
  });

  it('keeps a partner exchange word for word', () => {
    const { db } = migrateDemo();
    const [exchange] = listEntries(db, 'DEMO-2');
    expect(exchange?.entryType).toBe('exchange');
    expect(exchange?.body).toContain('- Expected volume: 50 000 rows');
    expect(exchange?.data).toEqual({
      direction: 'sent',
      partner: 'API team',
      title: 'Index on the customer name',
    });
  });

  it('copies the attachments next to the database', () => {
    const { db, database } = migrateDemo();
    const [path] = column(db, 'SELECT path FROM attachment');
    expect(path).toBe('attachments/DEMO-1/A1-search-results.png');
    expect(existsSync(join(database, '..', String(path)))).toBe(true);
  });

  it('turns a delivery lot into a delivery batch of its tickets', () => {
    const { db } = migrateDemo();
    expect(column(db, 'SELECT name FROM deliveryBatch')).toEqual(['First delivery']);
    expect(column(db, 'SELECT ticketId FROM deliveryBatchTicket')).toEqual(['DEMO-1']);
  });

  it('keeps the test runs that were not removed', () => {
    const { tracker, database } = setUp();
    appendFileSync(
      join(tracker, 'projects/demo/tickets/DEMO-3/test-runs.jsonl'),
      [
        {
          type: 'run',
          id: 'R1',
          kind: 'unit',
          at: '2026-10-12T08:00:00.000Z',
          session: 's',
          status: 'passed',
          specs: [],
          passed: 3,
        },
        {
          type: 'run',
          id: 'R2',
          kind: 'e2e',
          at: '2026-10-12T08:10:00.000Z',
          session: 's',
          status: 'failed',
          specs: [],
          failed: 1,
        },
        {
          type: 'removal',
          runId: 'R2',
          at: '2026-10-12T08:20:00.000Z',
          by: 's',
          reason: 'Probe run',
        },
      ]
        .map((line) => JSON.stringify(line))
        .join('\n') + '\n',
    );
    migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    const db = openDatabase(database);
    expect(column(db, 'SELECT result FROM testRun')).toEqual(['passed']);
  });

  it('keeps the AI usage of the project, tied to the ticket that held it', () => {
    const { tracker, database } = setUp();
    const usage = (projectId: string, items: string[]): string =>
      JSON.stringify({
        type: 'usage',
        id: `u-${projectId}`,
        at: '2026-10-12T10:02:00.000Z',
        event: 'stop',
        session: 's',
        source: 'x',
        scannedBytes: 1,
        items,
        projectId,
        attribution: 'held',
        firstAt: '2026-10-12T10:00:00.000Z',
        lastAt: '2026-10-12T10:02:00.000Z',
        messageIds: [],
        models: [
          {
            model: 'model-a',
            long: false,
            messages: 1,
            input: 6,
            output: 1288,
            cacheRead: 190000,
            cacheWrite5m: 100,
            cacheWrite1h: 3100,
          },
        ],
      });
    writeFileSync(
      join(tracker, 'usage.jsonl'),
      `${usage('demo', ['demo:DEMO-1'])}\n${usage('shop', ['shop:SHOP-1'])}\n`,
    );
    migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    const rows = openDatabase(database)
      .prepare('SELECT ticketId, cacheWriteTokens, provenance FROM usage')
      .all();
    expect(rows.map((row) => ({ ...row }))).toEqual([
      { ticketId: 'DEMO-1', cacheWriteTokens: 3200, provenance: 'measured' },
    ]);
  });

  it('leaves the V1 folder untouched', () => {
    const { tracker, database } = setUp();
    const before = fingerprint(tracker);
    migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    expect(fingerprint(tracker)).toBe(before);
  });

  it('refuses to overwrite an existing database', () => {
    const { tracker, database } = setUp();
    migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database });
    expect(() => migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database })).toThrow(
      /already exists/,
    );
  });

  it('leaves nothing behind when the migration fails, so that it can be run again', () => {
    const { tracker, database } = setUp();
    rmSync(join(tracker, 'projects/demo/tickets/DEMO-1/attachments/A1-search-results.png'));
    expect(() => migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database })).toThrow(
      /ENOENT/,
    );
    expect(readdirSync(join(database, '..'))).toEqual([]);
  });

  it('refuses a project that is not in V1 schema 4', () => {
    const { tracker, database } = setUp();
    const file = join(tracker, 'projects/demo/project.json');
    writeFileSync(
      file,
      JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), schemaVersion: 3 }),
    );
    expect(() => migrateV1Project({ trackerFolder: tracker, projectId: 'demo', database })).toThrow(
      /schema 4/,
    );
    expect(existsSync(database)).toBe(false);
  });
});
