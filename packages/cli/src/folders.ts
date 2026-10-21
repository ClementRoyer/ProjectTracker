import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { z } from 'zod';
import type { Target } from './target';

/** The project the folders belong to: its root, and its tracker folder. */
export interface Project {
  root: string;
  trackerDir: string;
}

/** Where the working folders and the preview live, at the project root (ADR 0041, 0042). */
export const FOLDERS = '.worktrees';

const config = z
  .object({
    repos: z.array(z.object({ path: z.string() })).default([]),
    worktree: z
      .object({ branch: z.string().default('ticket/{key}'), setup: z.string().optional() })
      .default({ branch: 'ticket/{key}' }),
    preview: z.object({ setup: z.string().optional() }).default({}),
    commit: z.object({ gitmoji: z.boolean().default(true) }).default({ gitmoji: true }),
    changelogFile: z.string().default('CHANGELOG.md'),
  })
  .loose();

export type Settings = z.infer<typeof config>;

/** The main project, even when the command runs inside one of its working folders. */
export function mainProject(trackerDir: string): Project {
  const root = dirname(dirname(trackerDir));
  const inFolder = root.indexOf(`${sep}${FOLDERS}${sep}`);
  const main = inFolder === -1 ? root : root.slice(0, inFolder);
  return { root: main, trackerDir: join(main, 'tools', 'tracker') };
}

export function readConfig(project: Project): Settings {
  return config.parse(
    JSON.parse(readFileSync(join(project.trackerDir, 'tracker.config.json'), 'utf8')),
  );
}

/** The project's repositories (ADR 0040), or the project itself. */
export function repoPaths(settings: Settings): string[] {
  return settings.repos.length === 0 ? ['.'] : settings.repos.map((repo) => repo.path);
}

/** Local to this clone (`info/exclude`): the project's `.gitignore` stays as it is. */
export function excludeFromGit(root: string, patterns: string[]): void {
  let gitDir: string;
  try {
    if (resolve(run(root, ['rev-parse', '--show-toplevel'])) !== resolve(root)) return;
    gitDir = resolve(root, run(root, ['rev-parse', '--git-common-dir']));
  } catch {
    return;
  }
  const file = join(gitDir, 'info', 'exclude');
  const present = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
  const missing = patterns.filter((pattern) => !present.includes(pattern));
  if (missing.length === 0) return;
  mkdirSync(dirname(file), { recursive: true });
  const separator = present.length > 0 && present.at(-1) !== '' ? '\n' : '';
  appendFileSync(file, `${separator}${missing.join('\n')}\n`);
}

export function hasBranch(repo: string, branch: string): boolean {
  try {
    run(repo, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

export function hasStaged(repo: string): boolean {
  try {
    run(repo, ['diff', '--cached', '--quiet']);
    return false;
  } catch {
    return true;
  }
}

export function run(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export async function call(target: Target, operation: string, input: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${target.url}/api/${operation}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(`The project-tracker server does not answer on ${target.url}.`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(
      `Refused: ${error.success ? error.data.error : `error ${String(response.status)}`}`,
    );
  }
  return body;
}

/** The project's own preparation command, run in the folder on the agent's machine, never by the server. */
export function runSetup(command: string, folder: string): boolean {
  return spawnSync(command, { cwd: folder, shell: true, stdio: 'inherit' }).status === 0;
}
