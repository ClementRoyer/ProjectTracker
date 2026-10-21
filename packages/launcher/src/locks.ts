import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { isAbsolute, join, normalize } from 'node:path';
import { z } from 'zod';

// File holds of the mirror (ADR 0010): one `.lock` file per held file, created atomically, kept
// outside the mirror so that they never reach the deployed server.

export interface HoldOwner {
  key: string;
  executionId: string;
}

const lock = z.object({
  path: z.string(),
  key: z.string(),
  executionId: z.string(),
  at: z.string(),
});
const refusal = z.object({ path: z.string(), heldBy: z.string() });

export type Hold = z.infer<typeof lock>;

/** Holds a file for an execution; refused when another execution holds it. */
export function holdFile(
  locksDir: string,
  path: string,
  owner: HoldOwner,
): { ok: true } | { ok: false; heldBy: string } {
  const clean = mirrorPath(path);
  mkdirSync(locksDir, { recursive: true });
  const file = join(locksDir, `${encodeURIComponent(clean)}.lock`);
  try {
    const fd = openSync(file, 'wx');
    writeSync(fd, JSON.stringify({ path: clean, ...owner, at: new Date().toISOString() }));
    closeSync(fd);
    return { ok: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const holder = lock.parse(JSON.parse(readFileSync(file, 'utf8')));
    if (holder.executionId === owner.executionId) return { ok: true };
    writeFileSync(
      join(locksDir, `refused-${owner.executionId}.json`),
      JSON.stringify({ path: clean, heldBy: holder.key }),
    );
    return { ok: false, heldBy: holder.key };
  }
}

export function heldFiles(locksDir: string): Hold[] {
  if (!existsSync(locksDir)) return [];
  return readdirSync(locksDir)
    .filter((name) => name.endsWith('.lock'))
    .map((name) => lock.parse(JSON.parse(readFileSync(join(locksDir, name), 'utf8'))))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Frees every file of the execution: the launcher is the parent of each agent, so no hold is left behind. */
export function releaseExecution(locksDir: string, executionId: string): void {
  for (const hold of heldFiles(locksDir).filter(
    (candidate) => candidate.executionId === executionId,
  )) {
    rmSync(join(locksDir, `${encodeURIComponent(hold.path)}.lock`), { force: true });
  }
  rmSync(join(locksDir, `refused-${executionId}.json`), { force: true });
}

/** The last file the execution could not hold, if any. */
export function lastRefusal(locksDir: string, executionId: string): z.infer<typeof refusal> | null {
  const file = join(locksDir, `refused-${executionId}.json`);
  return existsSync(file) ? refusal.parse(JSON.parse(readFileSync(file, 'utf8'))) : null;
}

function mirrorPath(path: string): string {
  const clean = normalize(path).replaceAll('\\', '/');
  if (isAbsolute(clean) || clean.startsWith('..')) throw new Error(`Hors du miroir : ${path}`);
  return clean;
}
