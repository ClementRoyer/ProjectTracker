import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

export interface WorktreeCommand {
  action: 'add' | 'remove';
  key: string;
  branch: string | undefined;
  base: string | undefined;
}

const USAGE =
  'Usage : tracker worktree add <ticket> [--branch <branche>] [--base <branche>] | tracker worktree remove <ticket>';

/** The tool's files git does not hold: the folder links them to the main project's (ADR 0041). */
const ALWAYS_LINKED = ['tools/tracker/app', 'tools/tracker/developer.token'];
const LINKED_WHEN_MISSING = [
  'tools/tracker/tracker.config.json',
  '.mcp.json',
  '.claude/settings.json',
];

export function parseWorktree(args: readonly string[]): WorktreeCommand | string {
  const [action, key, ...options] = args;
  if ((action !== 'add' && action !== 'remove') || key === undefined) return USAGE;
  const option = (name: string): string | undefined => {
    const index = options.indexOf(name);
    return index === -1 ? undefined : options[index + 1];
  };
  return { action, key, branch: option('--branch'), base: option('--base') };
}

/** `tracker worktree add`: the ticket's folder on its branch, linked to the tool, prepared, recorded. */
export async function addWorktree(
  target: Target,
  project: Project,
  command: WorktreeCommand,
): Promise<string> {
  await call(target, 'getTicket', { key: command.key });
  const settings = readConfig(project);
  const relative = `${FOLDERS}/${command.key}`;
  const folder = join(project.root, relative);
  if (existsSync(folder)) throw new Error(`Le dossier ${relative} existe déjà.`);
  const branch = command.branch ?? settings.worktree.branch.replaceAll('{key}', command.key);
  const base = command.base ?? 'main';
  for (const repo of repoPaths(settings)) {
    const into = resolve(folder, repo);
    mkdirSync(dirname(into), { recursive: true });
    const exists = hasBranch(join(project.root, repo), branch);
    run(
      join(project.root, repo),
      exists ? ['worktree', 'add', into, branch] : ['worktree', 'add', '-b', branch, into, base],
    );
  }
  const links = linkTool(project, folder);
  excludeFromGit(project.root, ['/.worktrees/', ...links.map((link) => `/${link}`)]);
  await call(target, 'setWorktree', { key: command.key, path: relative, branch });
  const lines = [`Dossier de travail : ${relative} (branche ${branch})`];
  if (settings.worktree.setup !== undefined) {
    if (!runSetup(settings.worktree.setup, folder)) {
      throw new Error(
        `${lines.join('')} : créé, mais la préparation a échoué (${settings.worktree.setup})`,
      );
    }
    lines.push(`Préparé : ${settings.worktree.setup}`);
  }
  return [...lines, `Pour y travailler : cd ${relative}`].join('\n');
}

/** `tracker worktree remove`: git refuses a folder with uncommitted changes; the branch stays. */
export async function removeWorktree(
  target: Target,
  project: Project,
  command: WorktreeCommand,
): Promise<string> {
  const relative = `${FOLDERS}/${command.key}`;
  const folder = join(project.root, relative);
  for (const repo of repoPaths(readConfig(project))) {
    const into = resolve(folder, repo);
    if (!existsSync(into)) continue;
    try {
      run(join(project.root, repo), ['worktree', 'remove', into]);
    } catch {
      throw new Error(
        `${relative} garde des changements non commités : commite-les ou annule-les, puis relance.`,
      );
    }
  }
  // Only the links are left; removing them leaves the main project's files alone.
  rmSync(folder, { recursive: true, force: true });
  await call(target, 'forgetWorktree', { key: command.key });
  return `Dossier de travail ${relative} retiré ; la branche reste.`;
}

function linkTool(project: Project, folder: string): string[] {
  const linked = [
    ...ALWAYS_LINKED,
    ...LINKED_WHEN_MISSING.filter(
      (file) => existsSync(join(project.root, file)) && !existsSync(join(folder, file)),
    ),
  ];
  for (const file of linked) {
    mkdirSync(dirname(join(folder, file)), { recursive: true });
    rmSync(join(folder, file), { recursive: true, force: true });
    symlinkSync(join(project.root, file), join(folder, file));
  }
  return linked;
}
