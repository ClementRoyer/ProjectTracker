import type { DatabaseSync } from 'node:sqlite';
import type { Instant } from '../domain';

export interface PreviewConflict {
  key: string;
  files: string[];
  with: string[];
}

export interface PreviewBuild {
  builtAt: Instant;
  included: string[];
  conflicts: PreviewConflict[];
}

/** The last build of the preview (ADR 0009, 0042); only the last one is kept. */
export function readPreview(db: DatabaseSync): PreviewBuild | null {
  const row = db.prepare('SELECT builtAt, tickets, conflicts FROM preview').get();
  if (!row) return null;
  return {
    builtAt: String(row.builtAt),
    included: JSON.parse(String(row.tickets)) as string[],
    conflicts: JSON.parse(String(row.conflicts)) as PreviewConflict[],
  };
}

export function savePreview(db: DatabaseSync, build: PreviewBuild): void {
  db.prepare('DELETE FROM preview').run();
  db.prepare('INSERT INTO preview (builtAt, tickets, conflicts) VALUES (?, ?, ?)').run(
    build.builtAt,
    JSON.stringify(build.included),
    JSON.stringify(build.conflicts),
  );
}
