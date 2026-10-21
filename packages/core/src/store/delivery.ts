import type { DatabaseSync } from 'node:sqlite';
import type { Instant, Role } from '../domain';

/** A question as the answer needs it: its ticket, who asked and in which role. */
export function findQuestion(
  db: DatabaseSync,
  entryId: string,
): { ticketId: string; status: string; body: string; sessionId: string | null; role: Role } | null {
  const row = db
    .prepare(
      'SELECT q.ticketId, q.status, e.body, e.sessionId, e.role FROM question q JOIN entry e ON e.id = q.entryId WHERE q.entryId = ?',
    )
    .get(entryId);
  if (!row) return null;
  return {
    ticketId: String(row.ticketId),
    status: String(row.status),
    body: String(row.body),
    sessionId: typeof row.sessionId === 'string' ? row.sessionId : null,
    role: row.role === 'backend' ? 'backend' : 'front',
  };
}

export function markQuestionAnswered(
  db: DatabaseSync,
  entryId: string,
  answerEntryId: string,
): void {
  db.prepare("UPDATE question SET status = 'answered', answerEntryId = ? WHERE entryId = ?").run(
    answerEntryId,
    entryId,
  );
}

/** Something of the developer to bring to the assignee of a role (ADR 0007); the asking conversation if known. */
export function insertDelivery(
  db: DatabaseSync,
  delivery: { entryId: string; ticketId: string; role: Role; sessionId: string | null },
): void {
  db.prepare('INSERT INTO delivery (entryId, ticketId, role, sessionId) VALUES (?, ?, ?, ?)').run(
    delivery.entryId,
    delivery.ticketId,
    delivery.role,
    delivery.sessionId,
  );
}

export interface PendingDelivery {
  entryId: string;
  ticketId: string;
  role: Role;
  body: string;
  entryType: string;
  replyTo: string | null;
  data: unknown;
  createdAt: Instant;
}

/**
 * What waits for this agent: brought to the conversation that asked, to another conversation of the
 * same agent, or to whoever holds the role (F15).
 */
export function pendingDeliveries(db: DatabaseSync, agentId: string): PendingDelivery[] {
  return db
    .prepare(
      `SELECT d.entryId, d.ticketId, d.role, e.body, e.entryType, e.replyTo, e.createdAt, e.data
       FROM delivery d JOIN entry e ON e.id = d.entryId
       LEFT JOIN session s ON s.id = d.sessionId
       WHERE d.deliveredAt IS NULL AND (
         s.agentId = ?
         OR (d.sessionId IS NULL AND EXISTS (
           SELECT 1 FROM assignment a WHERE a.ticketId = d.ticketId AND a.role = d.role
             AND a.releasedAt IS NULL AND a.agentId = ?)))
       ORDER BY e.createdAt`,
    )
    .all(agentId, agentId)
    .map((row) => ({
      entryId: String(row.entryId),
      ticketId: String(row.ticketId),
      role: row.role === 'backend' ? 'backend' : 'front',
      body: String(row.body),
      entryType: String(row.entryType),
      replyTo: typeof row.replyTo === 'string' ? row.replyTo : null,
      data: typeof row.data === 'string' ? (JSON.parse(row.data) as unknown) : null,
      createdAt: String(row.createdAt),
    }));
}

export function markDelivered(
  db: DatabaseSync,
  entryId: string,
  sessionId: string,
  at: Instant,
): void {
  db.prepare(
    'UPDATE delivery SET deliveredAt = ?, sessionId = ? WHERE entryId = ? AND deliveredAt IS NULL',
  ).run(at, sessionId, entryId);
}

/** Returns false when nothing was delivered to this agent under that entry. */
export function markAcknowledged(
  db: DatabaseSync,
  entryId: string,
  agentId: string,
  at: Instant,
): boolean {
  const result = db
    .prepare(
      `UPDATE delivery SET acknowledgedAt = ? WHERE entryId = ? AND deliveredAt IS NOT NULL
       AND sessionId IN (SELECT id FROM session WHERE agentId = ?)`,
    )
    .run(at, entryId, agentId);
  return Number(result.changes) > 0;
}

/** When each delivered entry of the ticket was taken into account. */
export function acknowledgements(db: DatabaseSync, ticketId: string): Map<string, string> {
  const rows = db
    .prepare(
      'SELECT entryId, acknowledgedAt FROM delivery WHERE ticketId = ? AND acknowledgedAt IS NOT NULL',
    )
    .all(ticketId);
  return new Map(rows.map((row) => [String(row.entryId), String(row.acknowledgedAt)]));
}
