import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

/** Where to send the command and with which token. */
export interface Target {
  url: string;
  token: string;
}

const CONFIG = join('tools', 'tracker', 'tracker.config.json');
const trackerConfig = z
  .object({ port: z.number().default(9620), host: z.string().default('127.0.0.1') })
  .loose();

/**
 * An agent conversation gives TRACKER_URL and TRACKER_TOKEN (ADR 0011). The developer works in the project:
 * the address comes from its configuration and the token from `developer.token` (ADR 0027).
 */
export function findTarget(
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Target | string {
  const folder = env.TRACKER_DIR ?? findTrackerFolder(cwd);
  const url = env.TRACKER_URL ?? (folder ? urlOf(folder) : undefined);
  const token = env.TRACKER_TOKEN ?? (folder ? developerToken(folder) : undefined);
  if (url === undefined || token === undefined) {
    return 'Projet introuvable : lance la commande dans le projet (dossier tools/tracker/), ou donne TRACKER_URL et TRACKER_TOKEN.';
  }
  return { url, token };
}

const reposConfig = z
  .object({ repos: z.array(z.object({ name: z.string(), path: z.string() })).default([]) })
  .loose();

/** The repositories the project names (ADR 0040), with the project root; null when it names none. */
export function projectRepos(
  cwd: string,
): { root: string; repos: { name: string; path: string }[] } | null {
  const folder = findTrackerFolder(cwd);
  if (folder === undefined) return null;
  const { repos } = reposConfig.parse(
    JSON.parse(readFileSync(join(folder, 'tracker.config.json'), 'utf8')),
  );
  // The configuration sits in tools/tracker/: the project root is two folders up.
  return repos.length === 0 ? null : { root: dirname(dirname(folder)), repos };
}

export function findTrackerFolder(from: string): string | undefined {
  let current = from;
  for (;;) {
    if (existsSync(join(current, CONFIG))) return dirname(join(current, CONFIG));
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function urlOf(folder: string): string {
  const config = trackerConfig.parse(
    JSON.parse(readFileSync(join(folder, 'tracker.config.json'), 'utf8')),
  );
  return `http://${config.host}:${String(config.port)}`;
}

function developerToken(folder: string): string | undefined {
  const file = join(folder, 'developer.token');
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined;
}
