import { execFileSync } from 'node:child_process';

/**
 * The files the ticket changes in this git folder: compared with the base branch, plus new files.
 * The CLI runs git on the agent's machine; the server never does (ADR 0014).
 */
export function changedFiles(cwd: string, base: string): string[] {
  const git = (...args: string[]): string[] =>
    execFileSync('git', args, { cwd, encoding: 'utf8' })
      .split('\n')
      .filter((line) => line.trim() !== '');
  const root = git('rev-parse', '--show-toplevel')[0] ?? cwd;
  const inRoot = (...args: string[]): string[] =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter((line) => line.trim() !== '');
  const changed = inRoot('diff', '--name-only', base);
  const added = inRoot('ls-files', '--others', '--exclude-standard');
  return [...new Set([...changed, ...added])].sort();
}
