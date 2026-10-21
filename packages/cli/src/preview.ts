import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  call,
  excludeFromGit,
  FOLDERS,
  hasBranch,
  readConfig,
  repoPaths,
  run,
  runSetup,
  type Project,
} from './folders';
import type { Target } from './target';

const BRANCH = 'preview';
// The preview branch is thrown away at each build and never pushed: its merges are the tool's.
const MERGER = ['-c', 'user.name=project-tracker', '-c', 'user.email=project-tracker@localhost'];

const worktrees = z.object({
  worktrees: z.array(z.object({ key: z.string(), branch: z.string() })),
});

interface Conflict {
  key: string;
  files: string[];
  with: string[];
}

/** `tracker preview build`: the base, then each open ticket's branch merged in turn (ADR 0009, 0042). */
export async function buildPreview(
  target: Target,
  project: Project,
  base: string,
): Promise<string> {
  const { worktrees: tickets } = worktrees.parse(await call(target, 'listWorktrees', {}));
  const settings = readConfig(project);
  const relative = `${FOLDERS}/${BRANCH}`;
  const folder = join(project.root, relative);
  const repos = repoPaths(settings).map((repo) => ({
    repo,
    source: join(project.root, repo),
    into: resolve(folder, repo),
  }));
  excludeFromGit(project.root, [`/${FOLDERS}/`]);
  for (const { source, into } of repos) resetToBase(source, into, base);

  const included: string[] = [];
  const conflicts: Conflict[] = [];
  const filesOf = new Map<string, string[]>();
  for (const ticket of tickets) {
    const present = repos.filter(({ source }) => hasBranch(source, ticket.branch));
    filesOf.set(
      ticket.key,
      present.flatMap(({ repo, into }) =>
        lines(run(into, ['diff', '--name-only', `${base}...${ticket.branch}`])).map(prefix(repo)),
      ),
    );
    const heads = present.map(({ into }) => run(into, ['rev-parse', 'HEAD']));
    const files = mergeEverywhere(present, ticket);
    if (files === null) {
      included.push(ticket.key);
      continue;
    }
    // Left out of every repository, so the preview never holds half a ticket.
    present.forEach(({ into }, index) =>
      run(into, ['reset', '-q', '--hard', heads[index] ?? base]),
    );
    const others = included.filter((key) =>
      (filesOf.get(key) ?? []).some((file) => files.includes(file)),
    );
    conflicts.push({ key: ticket.key, files, with: others });
  }

  const prepared = settings.preview.setup === undefined || runSetup(settings.preview.setup, folder);
  await call(target, 'recordPreview', { included, conflicts });
  return [
    `Aperçu reconstruit dans ${relative} sur ${base} : ${included.length > 0 ? included.join(', ') : 'aucun ticket'}`,
    ...conflicts.map(
      (c) =>
        `Laissé de côté, conflit : ${c.key} (${c.files.join(', ')}${c.with.length > 0 ? ` ; avec ${c.with.join(', ')}` : ''})`,
    ),
    ...(prepared ? [] : [`La préparation a échoué : ${settings.preview.setup ?? ''}`]),
    `Serveur de développement : lance-le une fois dans ${relative}, il suit les reconstructions.`,
  ].join('\n');
}

/** The preview folder on the base again; anything left in it is the tool's and is dropped. */
function resetToBase(source: string, into: string, base: string): void {
  if (!existsSync(into)) {
    mkdirSync(dirname(into), { recursive: true });
    run(source, ['worktree', 'add', '-q', '-f', '-B', BRANCH, into, base]);
    return;
  }
  abortMerge(into);
  run(into, ['checkout', '-q', '-f', '-B', BRANCH, base]);
}

/** Merges the ticket's branch in each repository; the conflicting files, or null when all went in. */
function mergeEverywhere(
  present: { repo: string; into: string }[],
  ticket: { key: string; branch: string },
): string[] | null {
  for (const { repo, into } of present) {
    try {
      run(into, [
        ...MERGER,
        'merge',
        '-q',
        '--no-ff',
        '--no-edit',
        '-m',
        `Preview: ${ticket.key}`,
        ticket.branch,
      ]);
    } catch {
      const files = lines(run(into, ['diff', '--name-only', '--diff-filter=U'])).map(prefix(repo));
      abortMerge(into);
      return files;
    }
  }
  return null;
}

function abortMerge(into: string): void {
  try {
    run(into, ['merge', '--abort']);
  } catch {
    // No merge was left half done.
  }
}

const lines = (text: string): string[] => text.split('\n').filter((line) => line !== '');

/** Paths from the project root, as the changed files are (ADR 0040). */
const prefix =
  (repo: string) =>
  (file: string): string =>
    repo === '.' ? file : `${repo}/${file}`;
