import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { Role } from '../domain';
import { pendingBackendRequests } from './backend';

const openQuestionRow = z.object({
  ticketId: z.string(),
  entryId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  sessionId: z.string().nullable(),
  role: z.enum(['front', 'backend']).nullable(),
  data: z.string().nullable(),
});

/** What askQuestion keeps in the data of the question entry. */
const questionData = z.object({
  context: z.string().nullable().catch(null),
  options: z.array(z.string()).catch([]),
  recommendation: z.string().nullable().catch(null),
});

export interface OpenQuestion {
  ticketId: string;
  entryId: string;
  body: string;
  createdAt: string;
  sessionId: string | null;
  role: Role | null;
  context: string | null;
  options: string[];
  recommendation: string | null;
}

/** Questions still waiting for the developer, oldest first; for one ticket or all of them. */
export function openQuestions(db: DatabaseSync, ticketId?: string): OpenQuestion[] {
  return db
    .prepare(
      `SELECT q.ticketId, q.entryId, e.body, e.createdAt, e.sessionId, e.role, e.data
       FROM question q JOIN entry e ON e.id = q.entryId
       WHERE q.status = 'open' AND (? IS NULL OR q.ticketId = ?) ORDER BY e.createdAt`,
    )
    .all(ticketId ?? null, ticketId ?? null)
    .map((row) => {
      const { data, ...question } = openQuestionRow.parse(row);
      return { ...question, ...questionData.parse(data === null ? {} : JSON.parse(data)) };
    });
}

/** Back-end requests not answered yet: the ticket waits for the back-end (ADR 0010), unless a file holds it. */
export function activeBackendRequestDates(db: DatabaseSync, ticketId: string): string[] {
  const blocked = new Set(
    pendingBackendRequests(db, ticketId)
      .filter((r) => r.blockedOn !== null)
      .map((r) => r.id),
  );
  return db
    .prepare(
      "SELECT id, createdAt FROM backendRequest WHERE ticketId = ? AND status IN ('pending', 'taken', 'running', 'unreachable')",
    )
    .all(ticketId)
    .filter((row) => !blocked.has(String(row.id)))
    .map((row) => String(row.createdAt));
}

/** Requests that wait for a file held by another ticket (ADR 0021). */
export function blockedOnFiles(
  db: DatabaseSync,
  ticketId: string,
): { path: string; heldBy: string; since: string }[] {
  return pendingBackendRequests(db, ticketId).flatMap((request) =>
    request.blockedOn ? [{ ...request.blockedOn, since: request.createdAt }] : [],
  );
}

/** Shared resources the ticket queues for (ADR 0008). */
export function queuedResources(
  db: DatabaseSync,
  ticketId: string,
): { name: string; since: string }[] {
  return db
    .prepare('SELECT resource, queuedAt FROM resourceQueue WHERE ticketId = ?')
    .all(ticketId)
    .map((row) => ({ name: String(row.resource), since: String(row.queuedAt) }));
}
