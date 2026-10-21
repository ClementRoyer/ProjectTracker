import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import {
  PHASES,
  PRIORITIES,
  type Priority,
  type Progress,
  type Situation,
  type Ticket,
  type TicketSize,
  type Wait,
} from '../domain';

const ticketRow = z.object({
  id: z.string(),
  key: z.string(),
  origin: z.enum(['jira', 'local']),
  title: z.string(),
  priority: z.enum(PRIORITIES),
  dueDate: z.string().nullable(),
  size: z.enum(['small', 'medium', 'large']).nullable(),
  initialRequest: z.string().nullable(),
  jiraUrl: z.string().nullable(),
  jiraStatus: z.string().nullable(),
  groupId: z.string().nullable(),
  createdAt: z.string(),
});

export function insertTicket(db: DatabaseSync, ticket: Ticket): void {
  db.prepare(
    `INSERT INTO ticket (id, key, origin, title, priority, dueDate, size, initialRequest, jiraUrl, jiraStatus, groupId, createdAt)
     VALUES (:id, :key, :origin, :title, :priority, :dueDate, :size, :initialRequest, :jiraUrl, :jiraStatus, :groupId, :createdAt)`,
  ).run({
    id: ticket.id,
    key: ticket.key,
    origin: ticket.origin,
    title: ticket.title,
    priority: ticket.priority,
    dueDate: ticket.dueDate ?? null,
    size: ticket.size ?? null,
    initialRequest: ticket.initialRequest ?? null,
    jiraUrl: ticket.jiraUrl ?? null,
    jiraStatus: ticket.jiraStatus ?? null,
    groupId: ticket.groupId ?? null,
    createdAt: ticket.createdAt,
  });
}

const TICKET_COLUMNS =
  'id, key, origin, title, priority, dueDate, size, initialRequest, jiraUrl, jiraStatus, groupId, createdAt';

export function findTicketByKey(db: DatabaseSync, key: string): Ticket | null {
  const row = db.prepare(`SELECT ${TICKET_COLUMNS} FROM ticket WHERE key = ?`).get(key);
  return row === undefined ? null : toTicket(ticketRow.parse(row));
}

/** Every ticket, oldest first. */
export function allTickets(db: DatabaseSync): Ticket[] {
  return db
    .prepare(`SELECT ${TICKET_COLUMNS} FROM ticket ORDER BY createdAt, rowid`)
    .all()
    .map((row) => toTicket(ticketRow.parse(row)));
}

/** The highest number already used by a LOC-n key, 0 when there is none. */
export function lastLocalKeyNumber(db: DatabaseSync): number {
  const row = db
    .prepare(
      "SELECT max(CAST(substr(key, 5) AS INTEGER)) AS last FROM ticket WHERE key LIKE 'LOC-%'",
    )
    .get();
  return Number(row?.last ?? 0);
}

/** The group of that name, made at first use (ADR 0040). */
export function findOrCreateGroup(db: DatabaseSync, name: string, newId: string): string {
  const row = db.prepare('SELECT id FROM "group" WHERE name = ?').get(name);
  if (row) return String(row.id);
  db.prepare('INSERT INTO "group" (id, name) VALUES (?, ?)').run(newId, name);
  return newId;
}

export function saveGroup(db: DatabaseSync, ticketId: string, groupId: string | null): void {
  db.prepare('UPDATE ticket SET groupId = ? WHERE id = ?').run(groupId, ticketId);
}

export function groupNames(db: DatabaseSync): Map<string, string> {
  const rows = db.prepare('SELECT id, name FROM "group"').all();
  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

export function saveDueDate(db: DatabaseSync, ticketId: string, dueDate: string | null): void {
  db.prepare('UPDATE ticket SET dueDate = ? WHERE id = ?').run(dueDate, ticketId);
}

export function saveSize(db: DatabaseSync, ticketId: string, size: TicketSize | null): void {
  db.prepare('UPDATE ticket SET size = ? WHERE id = ?').run(size, ticketId);
}

export function savePriority(db: DatabaseSync, ticketId: string, priority: Priority): void {
  db.prepare('UPDATE ticket SET priority = ? WHERE id = ?').run(priority, ticketId);
}

function toTicket(row: z.infer<typeof ticketRow>): Ticket {
  const { initialRequest, jiraUrl, jiraStatus, groupId, dueDate, size, ...required } = row;
  const ticket: Ticket = required;
  if (dueDate !== null) ticket.dueDate = dueDate;
  if (size !== null) ticket.size = size;
  if (initialRequest !== null) ticket.initialRequest = initialRequest;
  if (jiraUrl !== null) ticket.jiraUrl = jiraUrl;
  if (jiraStatus !== null) ticket.jiraStatus = jiraStatus;
  if (groupId !== null) ticket.groupId = groupId;
  return ticket;
}

/** The situation row of a ticket; its closing date lives on the ticket itself. */
export interface SituationRecord {
  ticketId: string;
  situation: Situation;
  wait: Wait | null;
  updatedAt: string;
}

const situationRow = z.object({
  ticketId: z.string(),
  phase: z.enum(PHASES),
  progress: z.enum(['notStarted', 'inProgress', 'done']),
  progressNote: z.string().nullable(),
  waitKind: z
    .enum(['developer', 'backend', 'resource', 'fileHold', 'endUser', 'partner'])
    .nullable(),
  waitSince: z.string().nullable(),
  waitDetail: z.string().nullable(),
  updatedAt: z.string(),
  closedAt: z.string().nullable(),
});

type SituationRow = z.infer<typeof situationRow>;

export function saveSituation(db: DatabaseSync, record: SituationRecord): void {
  const { progress } = record.situation;
  const wait = record.wait;
  db.prepare(
    `INSERT INTO situation (ticketId, phase, progress, progressNote, waitKind, waitSince, waitDetail, updatedAt)
     VALUES (:ticketId, :phase, :progress, :progressNote, :waitKind, :waitSince, :waitDetail, :updatedAt)
     ON CONFLICT (ticketId) DO UPDATE SET phase = excluded.phase, progress = excluded.progress,
       progressNote = excluded.progressNote, waitKind = excluded.waitKind,
       waitSince = excluded.waitSince, waitDetail = excluded.waitDetail, updatedAt = excluded.updatedAt`,
  ).run({
    ticketId: record.ticketId,
    phase: record.situation.phase,
    progress: progress.state,
    progressNote: progress.state === 'inProgress' ? progress.note : null,
    waitKind: wait?.kind ?? null,
    waitSince: wait?.since ?? null,
    waitDetail: wait !== null && 'detail' in wait ? wait.detail : null,
    updatedAt: record.updatedAt,
  });
  db.prepare('UPDATE ticket SET closedAt = ? WHERE id = ?').run(
    record.situation.closedAt ?? null,
    record.ticketId,
  );
}

export function readSituation(db: DatabaseSync, ticketId: string): SituationRecord | null {
  const row = db
    .prepare(
      `SELECT s.*, t.closedAt FROM situation s JOIN ticket t ON t.id = s.ticketId WHERE s.ticketId = ?`,
    )
    .get(ticketId);
  if (row === undefined) return null;
  const parsed = situationRow.parse(row);
  const situation: Situation = { phase: parsed.phase, progress: toProgress(parsed) };
  if (parsed.closedAt !== null) situation.closedAt = parsed.closedAt;
  return { ticketId, situation, wait: toWait(parsed), updatedAt: parsed.updatedAt };
}

function toProgress(row: SituationRow): Progress {
  if (row.progress === 'inProgress') return { state: 'inProgress', note: row.progressNote ?? '' };
  return { state: row.progress };
}

function toWait(row: SituationRow): Wait | null {
  if (row.waitKind === null || row.waitSince === null) return null;
  if (row.waitKind === 'developer' || row.waitKind === 'backend') {
    return { kind: row.waitKind, since: row.waitSince };
  }
  return { kind: row.waitKind, since: row.waitSince, detail: row.waitDetail ?? '' };
}

/** What a Jira load may change on a ticket: its title, its request and its Jira status. */
export function updateFromJira(
  db: DatabaseSync,
  ticketId: string,
  fields: { title: string; initialRequest: string; jiraStatus: string; jiraUrl: string },
): void {
  db.prepare(
    'UPDATE ticket SET title = ?, initialRequest = ?, jiraStatus = ?, jiraUrl = ? WHERE id = ?',
  ).run(
    fields.title,
    fields.initialRequest === '' ? null : fields.initialRequest,
    fields.jiraStatus,
    fields.jiraUrl,
    ticketId,
  );
}
