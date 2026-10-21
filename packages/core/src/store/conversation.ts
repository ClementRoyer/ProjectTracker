import type { DatabaseSync } from 'node:sqlite';
import type { Instant, Role, WorkSignal } from '../domain';

/** The agent of that name, created on its first conversation; its name is stable (ADR 0011). */
export function findOrCreateAgent(
  db: DatabaseSync,
  agent: { id: string; name: string; tool: string | null },
): string {
  const existing = db.prepare('SELECT id FROM agent WHERE name = ?').get(agent.name);
  if (existing) return String(existing.id);
  db.prepare('INSERT INTO agent (id, name, tool) VALUES (?, ?, ?)').run(
    agent.id,
    agent.name,
    agent.tool,
  );
  return agent.id;
}

export function insertSession(
  db: DatabaseSync,
  session: { id: string; agentId: string; tokenHash: string; startedAt: Instant },
): void {
  db.prepare(
    'INSERT INTO session (id, agentId, tokenHash, startedAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)',
  ).run(session.id, session.agentId, session.tokenHash, session.startedAt, session.startedAt);
}

export function findSessionByTokenHash(
  db: DatabaseSync,
  tokenHash: string,
): { sessionId: string; agentId: string } | null {
  const row = db
    .prepare('SELECT id, agentId FROM session WHERE tokenHash = ? AND endedAt IS NULL')
    .get(tokenHash);
  return row ? { sessionId: String(row.id), agentId: String(row.agentId) } : null;
}

/** Agent names by conversation, to name the author of each entry. */
export function agentNamesBySession(db: DatabaseSync): Map<string, string> {
  const rows = db
    .prepare('SELECT s.id, a.name FROM session s JOIN agent a ON a.id = s.agentId')
    .all();
  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

export interface StoredAssignment {
  ticketId: string;
  role: Role;
  agentId: string | null;
  sessionId: string | null;
}

export function activeAssignments(db: DatabaseSync, ticketId: string): StoredAssignment[] {
  return db
    .prepare(
      'SELECT ticketId, role, agentId, sessionId FROM assignment WHERE ticketId = ? AND releasedAt IS NULL',
    )
    .all(ticketId)
    .map(toAssignment);
}

export function activeAssignmentsOfAgent(db: DatabaseSync, agentId: string): StoredAssignment[] {
  return db
    .prepare(
      'SELECT ticketId, role, agentId, sessionId FROM assignment WHERE agentId = ? AND releasedAt IS NULL',
    )
    .all(agentId)
    .map(toAssignment);
}

/** Takes the role; the same agent taking it again only moves it to its new conversation. */
export function saveAssignment(
  db: DatabaseSync,
  assignment: StoredAssignment,
  since: Instant,
): void {
  db.prepare(
    'UPDATE assignment SET releasedAt = ? WHERE ticketId = ? AND role = ? AND releasedAt IS NULL',
  ).run(since, assignment.ticketId, assignment.role);
  db.prepare(
    'INSERT INTO assignment (ticketId, role, assigneeKind, agentId, sessionId, since) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    assignment.ticketId,
    assignment.role,
    assignment.agentId === null ? 'developer' : 'agent',
    assignment.agentId,
    assignment.sessionId,
    since,
  );
}

function toAssignment(row: Record<string, unknown>): StoredAssignment {
  return {
    ticketId: String(row.ticketId),
    role: row.role === 'backend' ? 'backend' : 'front',
    agentId: typeof row.agentId === 'string' ? row.agentId : null,
    sessionId: typeof row.sessionId === 'string' ? row.sessionId : null,
  };
}

/** Who holds each role of the ticket, with the agent's name. */
export function activeAssignees(
  db: DatabaseSync,
  ticketId: string,
): { role: Role; agentName: string | null }[] {
  return db
    .prepare(
      `SELECT a.role, g.name FROM assignment a LEFT JOIN agent g ON g.id = a.agentId
       WHERE a.ticketId = ? AND a.releasedAt IS NULL ORDER BY a.role DESC`,
    )
    .all(ticketId)
    .map((row) => ({
      role: row.role === 'backend' ? 'backend' : 'front',
      agentName: typeof row.name === 'string' ? row.name : null,
    }));
}

/** Notes a start or an end of work on the tickets the agent holds; one ticket only when given. */
export function saveWorkSignal(
  db: DatabaseSync,
  agentId: string,
  signal: WorkSignal,
  ticketId: string | null,
): string[] {
  const rows = db
    .prepare(
      `UPDATE assignment SET workState = ?, workStateAt = ?
       WHERE agentId = ? AND releasedAt IS NULL AND (? IS NULL OR ticketId = ?) RETURNING ticketId`,
    )
    .all(signal.state, signal.at, agentId, ticketId, ticketId);
  return [...new Set(rows.map((row) => String(row.ticketId)))];
}

/** The last start or end signalled on the ticket by an agent that still holds it. */
export function latestWorkSignal(db: DatabaseSync, ticketId: string): WorkSignal | null {
  const row = db
    .prepare(
      `SELECT workState, workStateAt FROM assignment
       WHERE ticketId = ? AND releasedAt IS NULL AND workState IS NOT NULL
       ORDER BY workStateAt DESC LIMIT 1`,
    )
    .get(ticketId);
  if (!row || typeof row.workStateAt !== 'string') return null;
  return { state: row.workState === 'started' ? 'started' : 'finished', at: row.workStateAt };
}
