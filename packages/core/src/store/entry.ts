import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { ENTRY_TYPES, type Entry } from '../domain';

const entryRow = z.object({
  id: z.string(),
  ticketId: z.string(),
  entryType: z.enum(ENTRY_TYPES),
  authorKind: z.enum(['developer', 'agent', 'jira', 'launcher', 'system']),
  sessionId: z.string().nullable(),
  role: z.enum(['front', 'backend']).nullable(),
  body: z.string(),
  data: z.string().nullable(),
  replyTo: z.string().nullable(),
  createdAt: z.string(),
});

/** Adds an entry to the journal; the database refuses any later change (ADR 0015). */
export function appendEntry(db: DatabaseSync, entry: Entry): void {
  db.prepare(
    `INSERT INTO entry (id, ticketId, entryType, authorKind, sessionId, role, body, data, replyTo, createdAt)
     VALUES (:id, :ticketId, :entryType, :authorKind, :sessionId, :role, :body, :data, :replyTo, :createdAt)`,
  ).run({
    id: entry.id,
    ticketId: entry.ticketId,
    entryType: entry.entryType,
    authorKind: entry.authorKind,
    sessionId: entry.sessionId ?? null,
    role: entry.role ?? null,
    body: entry.body,
    data: entry.data === undefined ? null : JSON.stringify(entry.data),
    replyTo: entry.replyTo ?? null,
    createdAt: entry.createdAt,
  });
}

export function listEntries(db: DatabaseSync, ticketId: string): Entry[] {
  return db
    .prepare('SELECT * FROM entry WHERE ticketId = ? ORDER BY createdAt, rowid')
    .all(ticketId)
    .map((row) => toEntry(entryRow.parse(row)));
}

function toEntry(row: z.infer<typeof entryRow>): Entry {
  const { sessionId, role, data, replyTo, ...required } = row;
  const entry: Entry = required;
  if (sessionId !== null) entry.sessionId = sessionId;
  if (role !== null) entry.role = role;
  if (data !== null) entry.data = JSON.parse(data);
  if (replyTo !== null) entry.replyTo = replyTo;
  return entry;
}

/** Entries of every ticket written after `since` (all of them when `since` is null), oldest first. */
export function listEntriesSince(db: DatabaseSync, since: string | null): Entry[] {
  return db
    .prepare('SELECT * FROM entry WHERE createdAt > ? ORDER BY createdAt, rowid')
    .all(since ?? '')
    .map((row) => toEntry(entryRow.parse(row)));
}

/** When anything last happened on the ticket. */
export function lastActivityAt(db: DatabaseSync, ticketId: string): string | null {
  const row = db.prepare('SELECT max(createdAt) AS at FROM entry WHERE ticketId = ?').get(ticketId);
  return typeof row?.at === 'string' ? row.at : null;
}

/** The last entry an agent wrote; a question or an end-of-turn reply (data.structured) ends its turn. */
export function lastAgentEntry(
  db: DatabaseSync,
  ticketId: string,
): { at: string; endsTurn: boolean } | null {
  const row = db
    .prepare(
      `SELECT createdAt, entryType = 'question' OR json_type(data, '$.structured') IS NOT NULL AS endsTurn
       FROM entry WHERE ticketId = ? AND authorKind = 'agent' ORDER BY createdAt DESC, rowid DESC LIMIT 1`,
    )
    .get(ticketId);
  return row ? { at: String(row.createdAt), endsTurn: row.endsTurn === 1 } : null;
}

const declaredWait = z
  .object({ kind: z.enum(['endUser', 'partner']), detail: z.string() })
  .nullable();

/** The wait last declared by hand on the ticket (ADR 0015), kept in its situation-change entry. */
export function latestDeclaredWait(
  db: DatabaseSync,
  ticketId: string,
): { kind: 'endUser' | 'partner'; detail: string; since: string } | null {
  const row = db
    .prepare(
      `SELECT json_extract(data, '$.declaredWait') AS wait, createdAt FROM entry
       WHERE ticketId = ? AND entryType = 'situationChange' AND json_type(data, '$.declaredWait') IS NOT NULL
       ORDER BY createdAt DESC, rowid DESC LIMIT 1`,
    )
    .get(ticketId);
  if (row === undefined || typeof row.wait !== 'string') return null;
  const wait = declaredWait.parse(JSON.parse(row.wait));
  return wait === null ? null : { ...wait, since: String(row.createdAt) };
}

/** Whether someone other than the developer wrote on the ticket after `since` (always true before a first visit). */
export function hasEntriesFromOthersSince(
  db: DatabaseSync,
  ticketId: string,
  since: string | null,
): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM entry WHERE ticketId = ? AND authorKind <> 'developer' AND createdAt > ? LIMIT 1",
    )
    .get(ticketId, since ?? '');
  return row !== undefined;
}

/** The Jira comments already copied into the journal of the ticket. */
export function knownJiraCommentIds(db: DatabaseSync, ticketId: string): Set<string> {
  const rows = db
    .prepare(
      "SELECT json_extract(data, '$.commentId') AS id FROM entry WHERE ticketId = ? AND entryType = 'jiraImport' AND json_extract(data, '$.commentId') IS NOT NULL",
    )
    .all(ticketId);
  return new Set(rows.map((row) => String(row.id)));
}
