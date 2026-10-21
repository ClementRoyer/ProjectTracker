import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../src';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function makeRepo(repo: string, files: Record<string, string>): void {
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'Developer');
  git(repo, 'config', 'user.email', 'developer@example.test');
  for (const [file, text] of Object.entries(files)) writeFileSync(join(repo, file), text);
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

/** A ticket with its folder and the commits given, each one changing a file of the folder. */
async function ticketWithCommits(
  root: string,
  title: string,
  commits: { file: string; text: string; message: string }[],
): Promise<string> {
  const created = JSON.parse((await runCli(['create-ticket', '--title', title], {}, root)).out) as {
    key: string;
  };
  await runCli(['worktree', 'add', created.key], {}, root);
  const folder = join(root, '.worktrees', created.key);
  for (const { file, text, message } of commits) {
    writeFileSync(join(folder, file), text);
    await runCli(['commit', message], {}, folder);
  }
  return created.key;
}

const subjects = (repo: string, count: number): string[] =>
  git(repo, 'log', `-${String(count)}`, '--format=%s').split('\n');

const phaseOf = async (key: string, root: string): Promise<string> =>
  (
    JSON.parse((await runCli(['get-ticket', key], {}, root)).out) as {
      situation: { phase: string };
    }
  ).situation.phase;

const batchCount = async (root: string): Promise<number> =>
  (JSON.parse((await runCli(['list-batches'], {}, root)).out) as { batches: unknown[] }).batches
    .length;

describe('delivery of a batch with its branches (ADR 0044)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-deliver-', { port: 9663, changelog: true }));
    makeRepo(root, { '.gitignore': 'tools/\n', 'list.ts': 'a\n', 'city.ts': 'a\n' });
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('refuses while the main folder has changes, and delivers nothing', async () => {
    const key = await ticketWithCommits(root, 'Rename the list', []);
    writeFileSync(join(root, 'list.ts'), 'changed\n');
    const { code, err } = await runCli(['deliver', 'Lot 0', key], {}, root);
    expect(code).toBe(1);
    expect(err).toMatch(/changements/);
    git(root, 'checkout', '--', 'list.ts');
    expect(await batchCount(root)).toBe(0);
  });

  it('merges nothing and records nothing when one branch conflicts', async () => {
    const first = await ticketWithCommits(root, 'Search by name', [
      { file: 'list.ts', text: 'name\n', message: '✨ Add search by name' },
    ]);
    const second = await ticketWithCommits(root, 'Sort the list', [
      { file: 'list.ts', text: 'sorted\n', message: '✨ Sort the list' },
    ]);
    const head = git(root, 'rev-parse', 'HEAD');
    const { code, err } = await runCli(['deliver', 'Lot 1', first, second], {}, root);
    expect(code).toBe(1);
    expect(err).toContain(second);
    expect(err).toContain('list.ts');
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head);
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(await batchCount(root)).toBe(0);
    expect(await phaseOf(first, root)).not.toBe('qaDelivery');
  });

  it('squashes each ticket into one commit with its first message, records the delivery and commits the changelog', async () => {
    const key = await ticketWithCommits(root, 'Search by city', [
      { file: 'city.ts', text: 'city\n', message: '✨ Add search by city' },
      { file: 'city.ts', text: 'city, fixed\n', message: '🐛 Fix search by city' },
    ]);
    await runCli(['accept-changelog', key, '--line', 'Recherche par ville'], {}, root);
    const { code, out } = await runCli(['deliver', 'Lot 1', 'LOC-2', key], {}, root);
    expect(code).toBe(0);
    expect(out).toContain('Lot 1');
    expect(subjects(root, 3)).toEqual([
      '📝 Update changelog for Lot 1',
      '✨ Add search by city',
      '✨ Add search by name',
    ]);
    expect(git(root, 'log', '-1', '--skip=1', '--format=%an')).toBe('Developer');
    expect(readFileSync(join(root, 'city.ts'), 'utf8')).toBe('city, fixed\n');
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toContain('Recherche par ville');
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(await phaseOf(key, root)).toBe('qaDelivery');
    expect(await batchCount(root)).toBe(1);
  });

  it('keeps the commits of a ticket on request', async () => {
    const key = await ticketWithCommits(root, 'Export the list', [
      { file: 'export.ts', text: 'a\n', message: '✨ Add export' },
      { file: 'export.ts', text: 'b\n', message: '🐛 Fix export' },
    ]);
    const { code } = await runCli(['deliver', 'Lot 2', key, '--keep', key], {}, root);
    expect(code).toBe(0);
    expect(git(root, 'log', '--format=%s', 'HEAD^..HEAD').split('\n')).toEqual([
      `🔀 Merge ticket/${key}`,
      '🐛 Fix export',
      '✨ Add export',
    ]);
  });

  it('records a ticket without a branch without touching git', async () => {
    const created = await runCli(['create-ticket', '--title', 'Answer a question'], {}, root);
    const { key } = JSON.parse(created.out) as { key: string };
    const head = git(root, 'rev-parse', 'HEAD');
    const { code } = await runCli(['deliver', 'Lot 3', key], {}, root);
    expect(code).toBe(0);
    expect(git(root, 'rev-parse', 'HEAD')).toBe(head);
    expect(await phaseOf(key, root)).toBe('qaDelivery');
  });
});

describe('delivery in a project with several repositories (ADR 0040, 0044)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-deliver-repos-', {
      port: 9664,
      repos: [
        { name: 'front', path: 'web' },
        { name: 'back', path: 'api' },
      ],
    }));
    makeRepo(join(root, 'web'), { 'list.ts': 'a\n' });
    makeRepo(join(root, 'api'), { 'orders.ts': 'a\n' });
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('squashes the branch in each repository where it has something', async () => {
    const key = await ticketWithCommits(root, 'Show orders', [
      { file: 'api/orders.ts', text: 'b\n', message: '✨ Show orders' },
    ]);
    const web = git(join(root, 'web'), 'rev-parse', 'HEAD');
    const { code } = await runCli(['deliver', 'Lot 1', key], {}, root);
    expect(code).toBe(0);
    expect(subjects(join(root, 'api'), 1)).toEqual(['✨ Show orders']);
    expect(git(join(root, 'web'), 'rev-parse', 'HEAD')).toBe(web);
  });
});
