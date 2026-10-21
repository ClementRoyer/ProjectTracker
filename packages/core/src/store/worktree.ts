import type { DatabaseSync } from 'node:sqlite';

export interface WorktreeRecord {
  path: string;
  branch: string;
}

export function readWorktree(db: DatabaseSync, ticketId: string): WorktreeRecord | null {
  const row = db.prepare('SELECT path, branch FROM worktree WHERE ticketId = ?').get(ticketId);
  return row ? { path: String(row.path), branch: String(row.branch) } : null;
}

export function saveWorktree(db: DatabaseSync, ticketId: string, worktree: WorktreeRecord): void {
  db.prepare(
    `INSERT INTO worktree (ticketId, path, branch) VALUES (?, ?, ?)
     ON CONFLICT (ticketId) DO UPDATE SET path = excluded.path, branch = excluded.branch`,
  ).run(ticketId, worktree.path, worktree.branch);
}

export function deleteWorktree(db: DatabaseSync, ticketId: string): void {
  db.prepare('DELETE FROM worktree WHERE ticketId = ?').run(ticketId);
}

/** The working folders of the tickets that are not closed. */
export function worktreesOfOpenTickets(db: DatabaseSync): ({ key: string } & WorktreeRecord)[] {
  return db
    .prepare(
      'SELECT t.key, w.path, w.branch FROM worktree w JOIN ticket t ON t.id = w.ticketId WHERE t.closedAt IS NULL',
    )
    .all()
    .map((row) => ({ key: String(row.key), path: String(row.path), branch: String(row.branch) }));
}
