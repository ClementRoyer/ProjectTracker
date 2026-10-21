import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { call, hasBranch, hasStaged, readConfig, repoPaths, run, type Project } from './folders';
import type { Target } from './target';

export interface DeliverCommand {
  name: string;
  keys: string[];
  base: string | undefined;
  keep: string[];
}

interface Repo {
  repo: string;
  into: string;
}

const USAGE =
  'Usage : tracker deliver "<nom de la livraison>" <ticket>… [--base <branche>] [--keep <ticket>]';

const detail = z.object({ worktree: z.object({ branch: z.string() }).nullable() });
const delivered = z.object({
  changelog: z.object({ written: z.number(), missing: z.array(z.string()) }).nullable(),
});

export function parseDeliver(args: readonly string[]): DeliverCommand | string {
  const [name, ...rest] = args;
  const command: DeliverCommand = { name: name ?? '', keys: [], base: undefined, keep: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index] ?? '';
    if (arg === '--base') command.base = rest[++index];
    else if (arg === '--keep') command.keep.push(rest[++index] ?? '');
    else command.keys.push(arg);
  }
  if (command.name === '' || command.name.startsWith('--') || command.keys.length === 0) {
    return USAGE;
  }
  return command;
}

/**
 * `tracker deliver`: the batch's branches into the base of the main folder, one commit per ticket,
 * then the delivery noted; all or nothing (ADR 0044). Nothing is pushed.
 */
export async function deliver(
  target: Target,
  project: Project,
  command: DeliverCommand,
  base: string,
): Promise<string> {
  const settings = readConfig(project);
  const repos = repoPaths(settings).map((repo) => ({ repo, into: join(project.root, repo) }));
  for (const repo of repos) checkReady(repo, base);
  const branches = await branchesOf(target, command.keys, settings.worktree.branch);
  const heads = repos.map(({ into }) => run(into, ['rev-parse', 'HEAD']));
  const lines: string[] = [];
  let batch: z.infer<typeof delivered>;
  try {
    for (const [key, branch] of branches) {
      lines.push(merge(repos, { key, branch, keep: command.keep.includes(key) }, base));
    }
    batch = delivered.parse(
      await call(target, 'deliverBatch', { name: command.name, keys: command.keys }),
    );
  } catch (error) {
    repos.forEach(({ into }, index) => run(into, ['reset', '-q', '--hard', heads[index] ?? '']));
    throw error;
  }
  return [
    `Livraison « ${command.name} » notée : ${command.keys.join(', ')} en livraison en qualité.`,
    ...lines,
    ...changelogLines(project, settings.changelogFile, command.name, batch.changelog),
    'Rien n’est poussé : à toi de publier la branche quand tu le décides.',
  ].join('\n');
}

function checkReady({ repo, into }: Repo, base: string): void {
  const current = run(into, ['branch', '--show-current']);
  if (current !== base) {
    throw new Error(`Le dossier principal doit être sur ${base} : ${repo} est sur ${current}.`);
  }
  if (run(into, ['status', '--porcelain', '--untracked-files=no']) !== '') {
    throw new Error(
      `${repo} a des changements non commités : commite-les ou annule-les, puis relance.`,
    );
  }
}

/** Each ticket's branch: its working folder's, else the model's (ADR 0041). Unknown tickets stop here. */
async function branchesOf(
  target: Target,
  keys: string[],
  model: string,
): Promise<[string, string][]> {
  const branches: [string, string][] = [];
  for (const key of keys) {
    const { worktree } = detail.parse(await call(target, 'getTicket', { key }));
    branches.push([key, worktree?.branch ?? model.replaceAll('{key}', key)]);
  }
  return branches;
}

/** The ticket's branch in each repository where it has something; a conflict stops the delivery. */
function merge(
  repos: Repo[],
  { key, branch, keep }: { key: string; branch: string; keep: boolean },
  base: string,
): string {
  const merged = repos.filter(
    ({ into }) =>
      hasBranch(into, branch) && run(into, ['rev-list', '--count', `HEAD..${branch}`]) !== '0',
  );
  for (const { repo, into } of merged) {
    const files = keep ? mergeKeeping(into, branch) : squash(into, branch);
    if (files !== null) {
      const paths = files.map((file) => (repo === '.' ? file : `${repo}/${file}`));
      throw new Error(
        `Conflit : ${key} (${paths.join(', ')}). Rien n’a été livré : règle le conflit dans sa branche, puis relance.`,
      );
    }
  }
  if (merged.length === 0) return `${key} : rien à réunir`;
  const where = merged.some(({ repo }) => repo !== '.')
    ? ` (${merged.map(({ repo }) => repo).join(', ')})`
    : '';
  return `${key} réuni dans ${base}${where}${keep ? ', avec ses commits' : ', en un commit'}`;
}

/** One commit with the message of the branch's first commit, the developer as author (ADR 0009). */
function squash(into: string, branch: string): string[] | null {
  const [message = `Deliver ${branch}`] = run(into, [
    'log',
    '--reverse',
    '--format=%s',
    `HEAD..${branch}`,
  ]).split('\n');
  try {
    run(into, ['merge', '-q', '--squash', branch]);
  } catch {
    return conflicted(into);
  }
  if (hasStaged(into)) run(into, ['commit', '-q', '-m', message]);
  return null;
}

function mergeKeeping(into: string, branch: string): string[] | null {
  try {
    run(into, ['merge', '-q', '--no-ff', '-m', `🔀 Merge ${branch}`, branch]);
    return null;
  } catch {
    return conflicted(into);
  }
}

const conflicted = (into: string): string[] =>
  run(into, ['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);

/** The server wrote the changelog (ADR 0037); it goes into the repository that holds it. */
function changelogLines(
  project: Project,
  changelogFile: string,
  name: string,
  changelog: { written: number; missing: string[] } | null,
): string[] {
  if (changelog === null) return [];
  const missing =
    changelog.missing.length > 0
      ? [`Sans ligne de changelog acceptée : ${changelog.missing.join(', ')}`]
      : [];
  if (changelog.written === 0) return missing;
  const file = resolve(project.root, changelogFile);
  let repo: string;
  try {
    repo = run(dirname(file), ['rev-parse', '--show-toplevel']);
  } catch {
    return [`Changelog : ${String(changelog.written)} lignes, hors dépôt`, ...missing];
  }
  run(repo, ['add', file]);
  if (hasStaged(repo)) run(repo, ['commit', '-q', '-m', `📝 Update changelog for ${name}`]);
  return [`Changelog commité : ${String(changelog.written)} lignes`, ...missing];
}
