import { basename, dirname, resolve } from 'node:path';
import { call, FOLDERS, hasStaged, readConfig, repoPaths, run, type Project } from './folders';
import type { Target } from './target';

export interface CommitCommand {
  message: string;
  ticket: string | undefined;
}

const USAGE = 'Usage : tracker commit "<gitmoji> <phrase>" [--ticket <ticket>]';
const MAX_LENGTH = 72;
// What agent tools add on their own: the author is the developer (ADR 0009).
const ATTRIBUTION = /^(co-authored-by:|.*generated with)/i;
const GITMOJI = /^\p{Extended_Pictographic}️? \S/u;

export function parseCommit(args: readonly string[]): CommitCommand | string {
  const [message, ...options] = args;
  if (message === undefined || message.startsWith('--')) return USAGE;
  const index = options.indexOf('--ticket');
  return { message, ticket: index === -1 ? undefined : options[index + 1] };
}

/** The message as committed: the project's convention, one line, no attribution (ADR 0043). */
export function commitMessage(raw: string, gitmoji: boolean): string {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !ATTRIBUTION.test(line));
  const [message] = lines;
  if (message === undefined) throw new Error('Le message de commit est vide.');
  if (lines.length > 1) throw new Error('Le message de commit tient sur une ligne, sans corps.');
  if ([...new Intl.Segmenter().segment(message)].length > MAX_LENGTH) {
    throw new Error(`Le message de commit dépasse ${String(MAX_LENGTH)} caractères.`);
  }
  if (gitmoji && !GITMOJI.test(message)) {
    throw new Error('Le message de commit commence par un gitmoji puis une espace : « ✨ Add … ».');
  }
  return message;
}

/**
 * `tracker commit`: everything in a ticket folder, only what is staged in the main folder (shared
 * between tickets), in each repository that has something; then a note on the ticket.
 */
export async function commit(
  target: Target,
  project: Project,
  trackerDir: string,
  command: CommitCommand,
): Promise<string> {
  const settings = readConfig(project);
  const message = commitMessage(command.message, settings.commit.gitmoji);
  const { here, inFolder } = workingFolder(project, trackerDir);
  const key = command.ticket ?? (inFolder ? basename(here) : undefined);
  if (key !== undefined) await call(target, 'getTicket', { key });

  const repos = repoPaths(settings).map((repo) => ({ repo, into: resolve(here, repo) }));
  if (inFolder) for (const { into } of repos) run(into, ['add', '-A']);
  const staged = repos.filter(({ into }) => hasStaged(into));
  if (staged.length === 0) {
    throw new Error(
      inFolder
        ? 'Rien à commiter dans le dossier du ticket.'
        : 'Rien à commiter : dans le dossier principal, seul ce qui est indexé (git add) est commité.',
    );
  }
  const shas = staged.map(({ repo, into }) => {
    run(into, ['commit', '-q', '-m', message]);
    const sha = run(into, ['rev-parse', '--short', 'HEAD']);
    return repo === '.' ? sha : `${sha} (${repo})`;
  });
  const done = `Commit ${shas.join(', ')} : ${message}`;
  if (key === undefined) return done;
  await call(target, 'recordEntry', { key, entryType: 'progress', body: done });
  return `${done}\nNoté sur ${key}.`;
}

/** Where the command runs: the main folder, or a ticket's folder in `.worktrees`. */
function workingFolder(project: Project, trackerDir: string): { here: string; inFolder: boolean } {
  const here = dirname(dirname(trackerDir));
  const inFolder = resolve(here) !== resolve(project.root);
  if (inFolder && basename(here) === 'preview') {
    throw new Error(`${FOLDERS}/preview est reconstruit par l’outil : on n’y commite pas.`);
  }
  return { here, inFolder };
}
