import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** A fingerprint of every file of the mirror, to find what an execution changed (ADR 0010 guard). */
export function snapshot(mirror: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(mirror, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(
      relative(mirror, path).replaceAll('\\', '/'),
      createHash('sha1').update(readFileSync(path)).digest('hex'),
    );
  }
  return files;
}

export function changedSince(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((path) => before.get(path) !== after.get(path)).sort();
}
