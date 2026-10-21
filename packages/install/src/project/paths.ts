import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the tool lives in a project (ADR 0013, 0030); V1 is set aside next to it (ADR 0031). */
export interface ProjectPaths {
  root: string;
  trackerDir: string;
  appDir: string;
  configFile: string;
  backupsDir: string;
  v1Dir: string;
}

export function projectPaths(root: string): ProjectPaths {
  const trackerDir = join(root, 'tools', 'tracker');
  return {
    root,
    trackerDir,
    appDir: join(trackerDir, 'app'),
    configFile: join(trackerDir, 'tracker.config.json'),
    backupsDir: join(trackerDir, 'backups'),
    v1Dir: join(root, 'tools', 'tracker-v1'),
  };
}

/** What tools/tracker holds: nothing, a V2, a V1 (its launcher tracker.mjs), or something else. */
export function installedKind(paths: ProjectPaths): 'none' | 'v2' | 'v1' | 'other' {
  if (!existsSync(paths.trackerDir)) return 'none';
  if (installedVersion(paths)?.startsWith('2.') === true) return 'v2';
  if (existsSync(join(paths.trackerDir, 'tracker.mjs'))) return 'v1';
  return 'other';
}

export function installedVersion(paths: ProjectPaths): string | null {
  const file = join(paths.appDir, 'VERSION');
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
}
