import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { Instant } from '../domain';

/** Why a request waits for a file: the execution found it held by another ticket (ADR 0021). */
export interface BlockedOn {
  path: string;
  heldBy: string;
}

export interface PendingBackendRequest {
  id: string;
  ticketId: string;
  entryId: string;
  createdAt: Instant;
  blockedOn: BlockedOn | null;
}

const outcome = z.object({
  status: z.enum(['done', 'failed', 'blocked']),
  blockedOn: z.object({ path: z.string(), heldBy: z.string() }).nullable().default(null),
});

export function insertBackendRequest(
  db: DatabaseSync,
  request: { id: string; ticketId: string; entryId: string; createdAt: Instant },
): void {
  db.prepare(
    "INSERT INTO backendRequest (id, ticketId, entryId, status, createdAt) VALUES (?, ?, ?, 'pending', ?)",
  ).run(request.id, request.ticketId, request.entryId, request.createdAt);
}

/** Pending requests, the most urgent ticket first, then the oldest (ADR 0021, 0032), with the file their last execution found held. */
export function pendingBackendRequests(
  db: DatabaseSync,
  ticketId?: string,
): PendingBackendRequest[] {
  return db
    .prepare(
      `SELECT r.id, r.ticketId, r.entryId, r.createdAt,
         (SELECT e.outcome FROM execution e WHERE e.requestId = r.id ORDER BY e.startedAt DESC, e.rowid DESC LIMIT 1) AS lastOutcome
       FROM backendRequest r JOIN ticket t ON t.id = r.ticketId
       WHERE r.status = 'pending' AND (? IS NULL OR r.ticketId = ?)
       ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         r.createdAt, r.rowid`,
    )
    .all(ticketId ?? null, ticketId ?? null)
    .map((row) => ({
      id: String(row.id),
      ticketId: String(row.ticketId),
      entryId: String(row.entryId),
      createdAt: String(row.createdAt),
      blockedOn:
        typeof row.lastOutcome === 'string'
          ? outcome.parse(JSON.parse(row.lastOutcome)).blockedOn
          : null,
    }));
}

/** Tickets whose back-end request is being worked on: one execution at a time per ticket. */
export function ticketsWithRunningExecution(db: DatabaseSync): Set<string> {
  const rows = db
    .prepare("SELECT ticketId FROM backendRequest WHERE status IN ('taken', 'running')")
    .all();
  return new Set(rows.map((row) => String(row.ticketId)));
}

export function setBackendRequestStatus(
  db: DatabaseSync,
  requestId: string,
  status: 'pending' | 'taken' | 'running' | 'done' | 'failed',
): void {
  db.prepare('UPDATE backendRequest SET status = ? WHERE id = ?').run(status, requestId);
}

export function insertExecution(
  db: DatabaseSync,
  execution: { id: string; requestId: string; launcherId: string; startedAt: Instant },
): void {
  db.prepare(
    'INSERT INTO execution (id, requestId, launcherId, startedAt) VALUES (?, ?, ?, ?)',
  ).run(execution.id, execution.requestId, execution.launcherId, execution.startedAt);
}

export function findExecution(
  db: DatabaseSync,
  executionId: string,
): { id: string; requestId: string; ticketId: string; endedAt: string | null } | null {
  const row = db
    .prepare(
      'SELECT e.id, e.requestId, r.ticketId, e.endedAt FROM execution e JOIN backendRequest r ON r.id = e.requestId WHERE e.id = ?',
    )
    .get(executionId);
  if (!row) return null;
  return {
    id: String(row.id),
    requestId: String(row.requestId),
    ticketId: String(row.ticketId),
    endedAt: typeof row.endedAt === 'string' ? row.endedAt : null,
  };
}

export function endExecution(
  db: DatabaseSync,
  executionId: string,
  end: {
    endedAt: Instant;
    status: 'done' | 'failed' | 'blocked';
    blockedOn: BlockedOn | null;
    undeclared: readonly string[];
  },
): void {
  db.prepare(
    'UPDATE execution SET endedAt = ?, outcome = ?, undeclaredChanges = ? WHERE id = ?',
  ).run(
    end.endedAt,
    JSON.stringify({ status: end.status, blockedOn: end.blockedOn }),
    JSON.stringify(end.undeclared),
    executionId,
  );
}

/** The launcher by name, created on its first sign of life; returns its id. */
export function saveLauncher(
  db: DatabaseSync,
  launcher: {
    id: string;
    name: string;
    lastSeenAt: Instant;
    holds?: readonly { path: string; key: string }[];
  },
): string {
  const existing = db.prepare('SELECT id FROM launcher WHERE name = ?').get(launcher.name);
  const id = existing ? String(existing.id) : launcher.id;
  if (!existing) {
    db.prepare("INSERT INTO launcher (id, name, tokenHash, lastSeenAt) VALUES (?, ?, '', ?)").run(
      id,
      launcher.name,
      launcher.lastSeenAt,
    );
  }
  db.prepare('UPDATE launcher SET lastSeenAt = ? WHERE id = ?').run(launcher.lastSeenAt, id);
  if (launcher.holds) {
    db.prepare('UPDATE launcher SET heldFiles = ? WHERE id = ?').run(
      JSON.stringify(launcher.holds),
      id,
    );
  }
  return id;
}

/** Files of the mirror held right now, as the launchers last said (indicative, ADR 0010). */
export function heldMirrorFiles(db: DatabaseSync): Set<string> {
  const holds = z.array(z.object({ path: z.string() }));
  const rows = db.prepare('SELECT heldFiles FROM launcher WHERE heldFiles IS NOT NULL').all();
  return new Set(
    rows.flatMap((row) => holds.parse(JSON.parse(String(row.heldFiles))).map((hold) => hold.path)),
  );
}
