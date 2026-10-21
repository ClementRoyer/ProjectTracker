import type { DatabaseSync } from 'node:sqlite';
import type { Instant, UsageRecord } from '../domain';

/** A question's state; its text is the journal entry `entryId`. */
export interface QuestionRecord {
  entryId: string;
  ticketId: string;
  options: readonly string[];
  recommendation?: string;
  status: 'open' | 'answered';
  answerEntryId?: string;
}

export function insertQuestion(db: DatabaseSync, question: QuestionRecord): void {
  db.prepare(
    `INSERT INTO question (entryId, ticketId, options, recommendation, status, answerEntryId)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    question.entryId,
    question.ticketId,
    JSON.stringify(question.options),
    question.recommendation ?? null,
    question.status,
    question.answerEntryId ?? null,
  );
}

export interface TestRunRecord {
  id: string;
  ticketId: string;
  kind: 'auto' | 'visual' | 'user';
  result: string;
  note?: string;
  at: Instant;
}

export function insertTestRun(db: DatabaseSync, run: TestRunRecord): void {
  db.prepare(
    'INSERT INTO testRun (id, ticketId, kind, result, note, at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(run.id, run.ticketId, run.kind, run.result, run.note ?? null, run.at);
}

/** `path` is relative to the folder of the database. */
export interface AttachmentRecord {
  id: string;
  ticketId: string;
  path: string;
  mime?: string;
  createdAt: Instant;
}

export function insertAttachment(db: DatabaseSync, attachment: AttachmentRecord): void {
  db.prepare(
    'INSERT INTO attachment (id, ticketId, path, mime, createdAt) VALUES (?, ?, ?, ?, ?)',
  ).run(
    attachment.id,
    attachment.ticketId,
    attachment.path,
    attachment.mime ?? null,
    attachment.createdAt,
  );
}

export function listAttachments(db: DatabaseSync, ticketId: string): AttachmentRecord[] {
  return db
    .prepare('SELECT * FROM attachment WHERE ticketId = ? ORDER BY createdAt, rowid')
    .all(ticketId)
    .map(toAttachment);
}

export function findAttachment(db: DatabaseSync, id: string): AttachmentRecord | null {
  const row = db.prepare('SELECT * FROM attachment WHERE id = ?').get(id);
  return row ? toAttachment(row) : null;
}

function toAttachment(row: Record<string, unknown>): AttachmentRecord {
  return {
    id: String(row.id),
    ticketId: String(row.ticketId),
    path: String(row.path),
    ...(typeof row.mime === 'string' ? { mime: row.mime } : {}),
    createdAt: String(row.createdAt),
  };
}

export interface DeliveryBatchRecord {
  id: string;
  name: string;
  deliveredAt?: Instant;
  ticketIds: readonly string[];
}

export function insertDeliveryBatch(db: DatabaseSync, batch: DeliveryBatchRecord): void {
  db.prepare('INSERT INTO deliveryBatch (id, name, deliveredAt) VALUES (?, ?, ?)').run(
    batch.id,
    batch.name,
    batch.deliveredAt ?? null,
  );
  const link = db.prepare('INSERT INTO deliveryBatchTicket (batchId, ticketId) VALUES (?, ?)');
  for (const ticketId of batch.ticketIds) link.run(batch.id, ticketId);
}

export interface StoredUsage extends UsageRecord {
  id: string;
  ticketId?: string;
  sessionId?: string;
}

export function insertUsage(db: DatabaseSync, usage: StoredUsage): void {
  db.prepare(
    `INSERT INTO usage (id, sessionId, ticketId, model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, provenance, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    usage.id,
    usage.sessionId ?? null,
    usage.ticketId ?? null,
    usage.model,
    usage.inputTokens,
    usage.outputTokens,
    usage.cacheReadTokens,
    usage.cacheWriteTokens,
    usage.provenance,
    usage.at,
  );
}

/** A delivery batch as stored, with the ids of its tickets. */
export interface StoredDeliveryBatch {
  id: string;
  name: string;
  deliveredAt: Instant | null;
  validatedAt: Instant | null;
  ticketIds: string[];
}

export function listDeliveryBatches(db: DatabaseSync): StoredDeliveryBatch[] {
  const links = db
    .prepare('SELECT batchId, ticketId FROM deliveryBatchTicket ORDER BY rowid')
    .all();
  return db
    .prepare(
      'SELECT id, name, deliveredAt, validatedAt FROM deliveryBatch ORDER BY deliveredAt DESC, rowid DESC',
    )
    .all()
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      deliveredAt: typeof row.deliveredAt === 'string' ? row.deliveredAt : null,
      validatedAt: typeof row.validatedAt === 'string' ? row.validatedAt : null,
      ticketIds: links
        .filter((link) => link.batchId === row.id)
        .map((link) => String(link.ticketId)),
    }));
}

export function markBatchValidated(db: DatabaseSync, batchId: string, at: Instant): void {
  db.prepare('UPDATE deliveryBatch SET validatedAt = ? WHERE id = ?').run(at, batchId);
}

/** The files the ticket changes, as last reported (ADR 0008): the new report replaces the old one. */
export function replaceChangedFiles(
  db: DatabaseSync,
  ticketId: string,
  paths: readonly string[],
  at: Instant,
): void {
  db.prepare('DELETE FROM changedFile WHERE ticketId = ?').run(ticketId);
  const insert = db.prepare(
    'INSERT INTO changedFile (ticketId, path, reportedAt) VALUES (?, ?, ?)',
  );
  for (const path of new Set(paths)) insert.run(ticketId, path, at);
}

/** Changed files of the tickets that are not closed. */
export function changedFilesOfOpenTickets(
  db: DatabaseSync,
): { ticketId: string; paths: string[] }[] {
  const rows = db
    .prepare(
      'SELECT c.ticketId, c.path FROM changedFile c JOIN ticket t ON t.id = c.ticketId WHERE t.closedAt IS NULL ORDER BY c.path',
    )
    .all();
  const byTicket = new Map<string, string[]>();
  for (const row of rows) {
    const paths = byTicket.get(String(row.ticketId)) ?? [];
    paths.push(String(row.path));
    byTicket.set(String(row.ticketId), paths);
  }
  return [...byTicket].map(([ticketId, paths]) => ({ ticketId, paths }));
}

export function insertJiraImport(
  db: DatabaseSync,
  load: { id: string; at: Instant; summary: unknown },
): void {
  db.prepare('INSERT INTO jiraImport (id, at, summary) VALUES (?, ?, ?)').run(
    load.id,
    load.at,
    JSON.stringify(load.summary),
  );
}

/** Every usage line, oldest first (ADR 0012). */
export function listUsage(db: DatabaseSync): StoredUsage[] {
  return db
    .prepare('SELECT * FROM usage ORDER BY at, rowid')
    .all()
    .map((row) => {
      const usage: StoredUsage = {
        id: String(row.id),
        model: String(row.model),
        inputTokens: Number(row.inputTokens),
        outputTokens: Number(row.outputTokens),
        cacheReadTokens: Number(row.cacheReadTokens),
        cacheWriteTokens: Number(row.cacheWriteTokens),
        provenance: row.provenance === 'declared' ? 'declared' : 'measured',
        at: String(row.at),
      };
      if (typeof row.ticketId === 'string') usage.ticketId = row.ticketId;
      if (typeof row.sessionId === 'string') usage.sessionId = row.sessionId;
      return usage;
    });
}
