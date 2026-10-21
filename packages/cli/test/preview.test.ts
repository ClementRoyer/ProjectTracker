import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../src';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.test', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

function makeRepo(repo: string, files: Record<string, string>): void {
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  for (const [file, text] of Object.entries(files)) writeFileSync(join(repo, file), text);
  git(repo, 'add', '.');
  git(repo, 'commit', '-qm', 'base');
}

/** Changes files in a ticket's folder and commits them there. */
function commitIn(folder: string, files: Record<string, string>): void {
  for (const [file, text] of Object.entries(files)) writeFileSync(join(folder, file), text);
  git(folder, 'add', '.');
  git(folder, 'commit', '-qm', 'work');
}

async function startProject(
  prefix: string,
  config: Record<string, unknown>,
): Promise<{ root: string; server: RunningServer }> {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, 'tools/tracker/app'), { recursive: true });
  writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify(config));
  const server = await startServer(join(root, 'tools/tracker/tracker.config.json'));
  return { root, server };
}

interface Preview {
  preview: {
    included: string[];
    conflicts: { key: string; files: string[]; with: string[] }[];
  } | null;
}

describe('preview on an integration branch, single repository (ADR 0042)', () => {
  let root = '';
  let server: RunningServer | undefined;
  const preview = (): string => join(root, '.worktrees/preview');
  const read = (file: string): string => readFileSync(join(preview(), file), 'utf8');

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-preview-', {
      port: 9655,
      preview: { setup: 'touch prepared' },
    }));
    makeRepo(root, { '.gitignore': 'tools/\nprepared\n', 'search.ts': 'name\n', 'list.ts': 'a\n' });
    for (const title of ['Search by name', 'Search by city', 'List view', 'No folder']) {
      await runCli(['create-ticket', '--title', title], {}, root);
    }
    for (const key of ['LOC-1', 'LOC-2', 'LOC-3']) {
      await runCli(['worktree', 'add', key], {}, root);
    }
    commitIn(join(root, '.worktrees/LOC-1'), { 'search.ts': 'by name\n' });
    commitIn(join(root, '.worktrees/LOC-2'), { 'search.ts': 'by city\n' });
    commitIn(join(root, '.worktrees/LOC-3'), { 'list.ts': 'b\n' });
    writeFileSync(join(root, '.worktrees/LOC-3/list.ts'), 'not committed\n');
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('merges the committed work of the open tickets with a folder, and leaves a conflicting one out', async () => {
    const { code, out } = await runCli(['preview', 'build'], {}, root);
    expect(code).toBe(0);
    expect(out).toMatch(/LOC-1, LOC-3/);
    expect(out).toMatch(/LOC-2/);
    expect(git(preview(), 'branch', '--show-current').trim()).toBe('preview');
    expect(read('search.ts')).toBe('by name\n');
    expect(read('list.ts')).toBe('b\n');
    expect(git(preview(), 'status', '--porcelain')).toBe('');
  });

  it('tells the server what went in, and which files conflict with which tickets', async () => {
    const state = JSON.parse((await runCli(['get-preview'], {}, root)).out) as Preview;
    expect(state.preview?.included).toEqual(['LOC-1', 'LOC-3']);
    expect(state.preview?.conflicts).toEqual([
      { key: 'LOC-2', files: ['search.ts'], with: ['LOC-1'] },
    ]);
  });

  it('runs the preparation of the preview folder', () => {
    expect(existsSync(join(preview(), 'prepared'))).toBe(true);
  });

  it('starts again from the base at each build, and takes the newly committed work', async () => {
    commitIn(join(root, '.worktrees/LOC-3'), { 'list.ts': 'c\n' });
    await runCli(['preview', 'build'], {}, root);
    expect(read('list.ts')).toBe('c\n');
    expect(
      git(preview(), 'log', '--merges', '--format=%s', 'main..preview').trim().split('\n'),
    ).toEqual(['Preview: LOC-3', 'Preview: LOC-1']);
  });
});

describe('preview with several repositories (ADR 0040, 0042)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-preview-repos-', {
      port: 9656,
      repos: [
        { name: 'front', path: 'web' },
        { name: 'back', path: 'api' },
      ],
    }));
    makeRepo(join(root, 'web'), { 'list.ts': 'a\n' });
    makeRepo(join(root, 'api'), { 'orders.ts': 'a\n' });
    for (const title of ['Change both sides', 'Change both sides too']) {
      await runCli(['create-ticket', '--title', title], {}, root);
    }
    for (const key of ['LOC-1', 'LOC-2']) await runCli(['worktree', 'add', key], {}, root);
    commitIn(join(root, '.worktrees/LOC-1/api'), { 'orders.ts': 'one\n' });
    commitIn(join(root, '.worktrees/LOC-2/web'), { 'search.ts': 'new\n' });
    commitIn(join(root, '.worktrees/LOC-2/api'), { 'orders.ts': 'two\n' });
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('leaves a ticket out of every repository when it conflicts in one', async () => {
    await runCli(['preview', 'build'], {}, root);
    const folder = join(root, '.worktrees/preview');
    expect(readFileSync(join(folder, 'api/orders.ts'), 'utf8')).toBe('one\n');
    expect(existsSync(join(folder, 'web/search.ts'))).toBe(false);
    const state = JSON.parse((await runCli(['get-preview'], {}, root)).out) as Preview;
    expect(state.preview?.conflicts).toEqual([
      { key: 'LOC-2', files: ['api/orders.ts'], with: ['LOC-1'] },
    ]);
  });
});
