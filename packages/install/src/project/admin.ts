import { copyFileSync, cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { backupProjectData, stamp } from './backup';
import type { ProjectPaths } from './paths';

const databaseOf = (paths: ProjectPaths): string => {
  const config = z
    .object({ database: z.string().default('tracker.db') })
    .loose()
    .parse(existsSync(paths.configFile) ? JSON.parse(readFileSync(paths.configFile, 'utf8')) : {});
  return resolve(paths.trackerDir, config.database);
};

/** A hot copy of the project's database and attachments, possible while the server runs (ADR 0013, 0035). */
export function backupProject(paths: ProjectPaths, now: string): Promise<string> {
  return backupProjectData(databaseOf(paths), paths.backupsDir, stamp(now));
}

/** Puts a backup folder back, server stopped: database and attachments; the current ones are saved first. */
export async function restoreProject(
  paths: ProjectPaths,
  saved: string,
  now: string,
  isServerUp: () => Promise<boolean>,
): Promise<string[]> {
  const database = databaseOf(paths);
  const savedDatabase = join(saved, basename(database));
  if (!existsSync(savedDatabase)) throw new Error(`Backup not found: ${savedDatabase}`);
  if (await isServerUp()) {
    throw new Error(
      'The server is running and holds the database open: stop it, then run the restore again.',
    );
  }
  const current = await backupProjectData(
    database,
    paths.backupsDir,
    `${stamp(now)}-before-restore`,
  );
  for (const suffix of ['-wal', '-shm']) rmSync(`${database}${suffix}`, { force: true });
  copyFileSync(savedDatabase, database);
  const attachments = join(dirname(database), 'attachments');
  rmSync(attachments, { recursive: true, force: true });
  if (existsSync(join(saved, 'attachments'))) {
    cpSync(join(saved, 'attachments'), attachments, { recursive: true });
  }
  return [`Database restored from ${saved}`, `The previous database is kept: ${current}`];
}
