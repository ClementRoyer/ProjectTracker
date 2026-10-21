import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { registryEntry } from '@project-tracker/contract';
import { z } from 'zod';

/** The projects of this machine, for the project menu of the page (ADR 0039). */
export type RegistryEntry = z.infer<typeof registryEntry>;

export function defaultRegistryFile(env: Readonly<Record<string, string | undefined>>): string {
  return env.TRACKER_REGISTRY ?? join(homedir(), '.config', 'project-tracker', 'projects.json');
}

export function readRegistry(file: string): RegistryEntry[] {
  if (!existsSync(file)) return [];
  const parsed = z.array(registryEntry).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data : [];
}

/** Adds the project, or updates it when its root is already there. */
export function registerProject(file: string, root: string, url: string): void {
  const others = readRegistry(file).filter((entry) => entry.root !== root);
  write(file, [...others, { name: basename(root), url, root }]);
}

export function unregisterProject(file: string, root: string): void {
  write(
    file,
    readRegistry(file).filter((entry) => entry.root !== root),
  );
}

function write(file: string, entries: RegistryEntry[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
}
