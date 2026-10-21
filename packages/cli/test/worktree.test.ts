import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../src';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function makeRepo(repo: string, file: string): void {
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  writeFileSync(join(repo, file), 'a\n');
  git(repo, 'add', '.');
  git(repo, '-c', 'user.name=t', '-c', 'user.email=t@example.test', 'commit', '-qm', 'base');
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

interface Detail {
  worktree: { path: string; branch: string } | null;
  changedFiles: { path: string }[];
}

describe('working folder of a ticket in a single repository (ADR 0041)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-wt-', {
      port: 9653,
      worktree: { setup: 'touch prepared' },
    }));
    writeFileSync(join(root, '.gitignore'), 'tools/\nprepared\n');
    makeRepo(root, 'list.ts');
    await runCli(['create-ticket', '--title', 'Search by name'], {}, root);
    await runCli(['create-ticket', '--title', 'Search by city'], {}, root);
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  const detail = async (key: string, cwd = root): Promise<Detail> =>
    JSON.parse((await runCli(['get-ticket', key], {}, cwd)).out) as Detail;

  it('makes the folder in .worktrees on a new branch, prepares it and records it on the ticket', async () => {
    const { code, out } = await runCli(['worktree', 'add', 'LOC-1'], {}, root);
    expect(code).toBe(0);
    expect(out).toMatch(/cd \.worktrees\/LOC-1/);
    const folder = join(root, '.worktrees/LOC-1');
    expect(git(folder, 'branch', '--show-current').trim()).toBe('ticket/LOC-1');
    expect(existsSync(join(folder, 'prepared'))).toBe(true);
    expect((await detail('LOC-1')).worktree).toEqual({
      path: '.worktrees/LOC-1',
      branch: 'ticket/LOC-1',
    });
  });

  it('lets the agent and the CLI find the tool from the folder, and git ignores the folder and the links', async () => {
    const folder = join(root, '.worktrees/LOC-1');
    expect(existsSync(join(folder, 'tools/tracker/app/VERSION'))).toBe(true);
    expect((await runCli(['list-tickets'], {}, folder)).code).toBe(0);
    expect(git(root, 'status', '--porcelain')).toBe('');
    expect(git(folder, 'status', '--porcelain')).toBe('');
  });

  it('reports the changed files from the folder, against the base branch', async () => {
    const folder = join(root, '.worktrees/LOC-1');
    writeFileSync(join(folder, 'list.ts'), 'b\n');
    await runCli(['report-changed-files', 'LOC-1'], {}, folder);
    expect((await detail('LOC-1')).changedFiles.map((file) => file.path)).toEqual(['list.ts']);
  });

  it('takes an existing branch given by --branch', async () => {
    git(root, 'branch', 'shared');
    const { code } = await runCli(['worktree', 'add', 'LOC-2', '--branch', 'shared'], {}, root);
    expect(code).toBe(0);
    expect(git(join(root, '.worktrees/LOC-2'), 'branch', '--show-current').trim()).toBe('shared');
  });

  it('makes no folder for a ticket that does not exist', async () => {
    const { code } = await runCli(['worktree', 'add', 'LOC-9'], {}, root);
    expect(code).toBe(1);
    expect(existsSync(join(root, '.worktrees/LOC-9'))).toBe(false);
  });

  it('refuses to remove a folder with uncommitted changes', async () => {
    const { code, err } = await runCli(['worktree', 'remove', 'LOC-1'], {}, root);
    expect(code).toBe(1);
    expect(err).toMatch(/non commités/);
    expect(existsSync(join(root, '.worktrees/LOC-1'))).toBe(true);
  });

  it('removes a clean folder, keeps its branch and the tool, and forgets it on the ticket', async () => {
    const { code } = await runCli(['worktree', 'remove', 'LOC-2'], {}, root);
    expect(code).toBe(0);
    expect(existsSync(join(root, '.worktrees/LOC-2'))).toBe(false);
    expect(git(root, 'branch', '--list', 'shared').trim()).toBe('shared');
    expect(existsSync(join(root, 'tools/tracker/app/VERSION'))).toBe(true);
    expect((await detail('LOC-2')).worktree).toBeNull();
  });
});

describe('working folder of a ticket in a project with several repositories (ADR 0040, 0041)', () => {
  let root = '';
  let server: RunningServer | undefined;

  beforeAll(async () => {
    ({ root, server } = await startProject('tracker-wt-repos-', {
      port: 9654,
      repos: [
        { name: 'front', path: 'web' },
        { name: 'back', path: 'api' },
      ],
    }));
    makeRepo(join(root, 'web'), 'list.ts');
    makeRepo(join(root, 'api'), 'orders.ts');
    await runCli(['create-ticket', '--title', 'Change both sides'], {}, root);
  });

  afterAll(async () => {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('makes one folder per repository on the same branch, and reports their files from the ticket folder', async () => {
    const { code } = await runCli(['worktree', 'add', 'LOC-1'], {}, root);
    expect(code).toBe(0);
    const folder = join(root, '.worktrees/LOC-1');
    for (const repo of ['web', 'api']) {
      expect(git(join(folder, repo), 'branch', '--show-current').trim()).toBe('ticket/LOC-1');
    }
    writeFileSync(join(folder, 'api/orders.ts'), 'b\n');
    await runCli(['report-changed-files', 'LOC-1'], {}, folder);
    const ticket = JSON.parse((await runCli(['get-ticket', 'LOC-1'], {}, root)).out) as Detail;
    expect(ticket.changedFiles.map((file) => file.path)).toEqual(['api/orders.ts']);
  });

  it('removes the folders of every repository', async () => {
    git(join(root, '.worktrees/LOC-1/api'), 'checkout', '--', 'orders.ts');
    const { code } = await runCli(['worktree', 'remove', 'LOC-1'], {}, root);
    expect(code).toBe(0);
    expect(existsSync(join(root, '.worktrees/LOC-1'))).toBe(false);
  });
});
