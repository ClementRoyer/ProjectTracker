import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { backupProject, restoreProject } from '../../src/project/admin';
import { projectPaths } from '../../src/project/paths';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** A project whose database holds one visit date, `value`. */
const project = (value: string): ReturnType<typeof projectPaths> => {
  const root = mkdtempSync(join(tmpdir(), 'tracker-admin-'));
  folders.push(root);
  const paths = projectPaths(root);
  mkdirSync(paths.trackerDir, { recursive: true });
  const db = openDatabase(join(paths.trackerDir, 'tracker.db'));
  db.prepare('INSERT INTO developer (lastVisitAt) VALUES (?)').run(value);
  db.close();
  return paths;
};

const visit = (paths: ReturnType<typeof projectPaths>): unknown => {
  const db = openDatabase(join(paths.trackerDir, 'tracker.db'));
  const row = db.prepare('SELECT lastVisitAt FROM developer').get();
  db.close();
  return row?.lastVisitAt;
};

const serverDown = (): Promise<boolean> => Promise.resolve(false);

describe('manual backup and restore (ADR 0013)', () => {
  it('saves the attachments with the database, and puts them back on restore (ADR 0035)', async () => {
    const paths = project('before');
    mkdirSync(join(paths.trackerDir, 'attachments', 'LOC-1'), { recursive: true });
    writeFileSync(join(paths.trackerDir, 'attachments', 'LOC-1', 'capture.png'), 'image');
    const saved = await backupProject(paths, '2026-10-20T10:00:00.000Z');
    rmSync(join(paths.trackerDir, 'attachments'), { recursive: true });
    await restoreProject(paths, saved, '2026-10-20T11:00:00.000Z', serverDown);
    expect(
      readFileSync(join(paths.trackerDir, 'attachments', 'LOC-1', 'capture.png'), 'utf8'),
    ).toBe('image');
  });

  it('saves a consistent copy of the database into backups/', async () => {
    const paths = project('before');
    const saved = await backupProject(paths, '2026-10-20T10:00:00.000Z');
    expect(saved).toBe(join(paths.backupsDir, '2026-10-20T10-00-00Z'));
  });

  it('puts a saved copy back, after saving the current database in case of a mistake', async () => {
    const paths = project('before');
    const saved = await backupProject(paths, '2026-10-20T10:00:00.000Z');
    const db = openDatabase(join(paths.trackerDir, 'tracker.db'));
    db.prepare("UPDATE developer SET lastVisitAt = 'after'").run();
    db.close();

    const report = await restoreProject(paths, saved, '2026-10-20T11:00:00.000Z', serverDown);
    expect(visit(paths)).toBe('before');
    expect(report.join('\n')).toContain('before-restore');
  });

  it('refuses to restore while the server runs, since it holds the database open', async () => {
    const paths = project('before');
    const saved = await backupProject(paths, '2026-10-20T10:00:00.000Z');
    await expect(
      restoreProject(paths, saved, '2026-10-20T11:00:00.000Z', () => Promise.resolve(true)),
    ).rejects.toThrow(/server/);
  });
});
