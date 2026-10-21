import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

/**
 * A consistent copy of the database, even while the server writes to it (ADR 0013), with the attachments kept
 * beside it (ADR 0035), in its own folder of backups/; returns that folder.
 */
export async function backupProjectData(
  database: string,
  backupsDir: string,
  label: string,
): Promise<string> {
  const folder = join(backupsDir, label);
  if (existsSync(folder)) throw new Error(`La sauvegarde existe déjà : ${folder}`);
  mkdirSync(folder, { recursive: true });
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    await backup(db, join(folder, basename(database)));
  } finally {
    db.close();
  }
  const attachments = join(dirname(database), 'attachments');
  if (existsSync(attachments)) {
    cpSync(attachments, join(folder, 'attachments'), { recursive: true });
  }
  return folder;
}

/** A file name from an instant: 2026-10-20T10-00-00Z. */
export function stamp(at: string): string {
  return at.replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
}
