import { globSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Large files are not reference documents: the page and the agents read text. */
const MAX_BYTES = 1024 * 1024;

/** The files the patterns of the configuration name, from the project root, read-only (ADR 0040). */
export function projectDocuments(
  root: string,
  patterns: readonly string[],
): { list: () => string[]; read: (path: string) => string | null } {
  const list = (): string[] =>
    patterns.length === 0
      ? []
      : globSync([...patterns], { cwd: root })
          .filter((path) => isSmallFile(join(root, path)))
          .sort();
  return {
    list,
    read: (path) => (list().includes(path) ? readFileSync(join(root, path), 'utf8') : null),
  };
}

function isSmallFile(file: string): boolean {
  const stats = statSync(file, { throwIfNoEntry: false });
  return stats !== undefined && stats.isFile() && stats.size <= MAX_BYTES;
}
