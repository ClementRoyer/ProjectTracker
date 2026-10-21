import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../src';
import { commitMessage } from '../src/commit';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function makeRepo(repo: string, file: string): void {
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'Developer');
  git(repo, 'config', 'user.email', 'developer@example.test');
  writeFileSync(join(repo, file), 'a\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-qm', 'base');
}

async function startProject(
  prefix: string,
  config: Record<string, unknown>,
): Promise<{ root: string; server: RunningServer }> {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, 'tools/tracker/app'), { recursive: true });
  writeFileSync(join(root, 'tools/tracker/app/VERSION'), '2.0.0\n');
  writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify(config));
  const server = await startServer(join(root, 'tools/tracker/tracker.config.json'));
  return { root, server };
}

const journal = async (key: string, cwd: string): Promise<string[]> =>
  (
    JSON.parse((await runCli(['get-ticket', key], {}, cwd)).out) as { entries: { body: string }[] }
  ).entries.map((entry) => entry.body);

describe('commit message (ADR 0043)', () => {
  it('keeps a gitmoji and one simple sentence', () => {
    expect(commitMessage('✨ Add search by name', true)).toBe('✨ Add search by name');
    expect(commitMessage('♻️ Split the list view', true)).toBe('♻️ Split the list view');
  });

  it('drops the co-author and generated-with lines an agent adds', () => {
    const message = [
      '🐛 Fix the empty list',
      '',
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
    ].join('\n');
    expect(commitMessage(message, true)).toBe('🐛 Fix the empty list');
  });

  it('refuses a message without a gitmoji, unless the project turns the rule off', () => {
    expect(() => commitMessage('Add search by name', true)).toThrow(/gitmoji/);
    expect(commitMessage('Add search by name', false)).toBe('Add search by name');
  });

  it('refuses more than one line, more than 72 characters, or nothing', () => {
    expect(() => commitMessage('✨ Add search\n\nWith a body', true)).toThrow(/one line/);
    expect(() => commitMessage(`✨ ${'a'.repeat(71)}`, true)).toThrow(/72/);
    expect(() => commitMessage('  ', true)).toThrow(/empty/);
  });
});

describe('commit from a ticket folder or the main folder (ADR 0043)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-commit-', { port: 9657 }));
    writeFileSync(join(root, '.gitignore'), 'tools/\n');
    makeRepo(root, 'list.ts');
    await runCli(['create-ticket', '--title', 'Search by name'], {}, root);
    await runCli(['create-ticket', '--title', 'Search by city'], {}, root);
    await runCli(['worktree', 'add', 'LOC-1'], {}, root);
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('commits everything in the ticket folder as the developer, and notes it on the ticket', async () => {
    const folder = join(root, '.worktrees/LOC-1');
    writeFileSync(join(folder, 'list.ts'), 'b\n');
    writeFileSync(join(folder, 'search.ts'), 'c\n');
    const { code, out } = await runCli(['commit', '✨ Add search by name'], {}, folder);
    expect(code).toBe(0);
    const sha = git(folder, 'rev-parse', '--short', 'HEAD');
    expect(out).toContain(sha);
    expect(git(folder, 'log', '-1', '--format=%an|%B')).toBe('Developer|✨ Add search by name');
    expect(git(folder, 'status', '--porcelain')).toBe('');
    expect(await journal('LOC-1', root)).toContain(`Commit ${sha}: ✨ Add search by name`);
  });

  it('commits only what is staged in the main folder, for the ticket given', async () => {
    writeFileSync(join(root, 'city.ts'), 'a\n');
    writeFileSync(join(root, 'other.ts'), 'a\n');
    git(root, 'add', 'city.ts');
    const { code } = await runCli(
      ['commit', '✨ Add search by city', '--ticket', 'LOC-2'],
      {},
      root,
    );
    expect(code).toBe(0);
    expect(git(root, 'show', '--name-only', '--format=', 'HEAD')).toBe('city.ts');
    expect(git(root, 'status', '--porcelain')).toBe('?? other.ts');
    const sha = git(root, 'rev-parse', '--short', 'HEAD');
    expect(await journal('LOC-2', root)).toContain(`Commit ${sha}: ✨ Add search by city`);
  });

  it('refuses when there is nothing to commit, or a bad message, and commits nothing', async () => {
    const head = git(root, 'rev-parse', 'HEAD');
    const nothing = await runCli(['commit', '✨ Add nothing'], {}, root);
    expect(nothing.code).toBe(1);
    expect(nothing.err).toMatch(/Nothing to commit/);
    const bad = await runCli(['commit', 'Add other'], {}, root);
    expect(bad.code).toBe(1);
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head);
  });

  it('refuses an unknown ticket before committing', async () => {
    git(root, 'add', 'other.ts');
    const head = git(root, 'rev-parse', 'HEAD');
    const { code } = await runCli(['commit', '✨ Add other', '--ticket', 'LOC-9'], {}, root);
    expect(code).toBe(1);
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head);
    git(root, 'reset', '-q', 'other.ts');
  });
});

describe('commit in a project with several repositories (ADR 0040, 0043)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-commit-repos-', {
      port: 9658,
      repos: [
        { name: 'front', path: 'web' },
        { name: 'back', path: 'api' },
      ],
    }));
    makeRepo(join(root, 'web'), 'list.ts');
    makeRepo(join(root, 'api'), 'orders.ts');
    await runCli(['create-ticket', '--title', 'Change both sides'], {}, root);
    await runCli(['worktree', 'add', 'LOC-1'], {}, root);
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('commits in each repository that changed, with the same message', async () => {
    const folder = join(root, '.worktrees/LOC-1');
    writeFileSync(join(folder, 'api/orders.ts'), 'b\n');
    writeFileSync(join(folder, 'web/list.ts'), 'b\n');
    const { code } = await runCli(['commit', '✨ Show orders in the list'], {}, folder);
    expect(code).toBe(0);
    const web = git(join(folder, 'web'), 'rev-parse', '--short', 'HEAD');
    const api = git(join(folder, 'api'), 'rev-parse', '--short', 'HEAD');
    expect(git(join(folder, 'api'), 'log', '-1', '--format=%s')).toBe('✨ Show orders in the list');
    expect(await journal('LOC-1', root)).toContain(
      `Commit ${web} (web), ${api} (api): ✨ Show orders in the list`,
    );
  });

  it('leaves a repository without changes alone', async () => {
    const folder = join(root, '.worktrees/LOC-1');
    const web = git(join(folder, 'web'), 'rev-parse', 'HEAD');
    writeFileSync(join(folder, 'api/orders.ts'), 'c\n');
    expect((await runCli(['commit', '🐛 Fix the order total'], {}, folder)).code).toBe(0);
    expect(git(join(folder, 'web'), 'rev-parse', 'HEAD')).toBe(web);
    const api = git(join(folder, 'api'), 'rev-parse', '--short', 'HEAD');
    expect(await journal('LOC-1', root)).toContain(`Commit ${api} (api): 🐛 Fix the order total`);
  });
});
