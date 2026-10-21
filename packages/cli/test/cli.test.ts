import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../src';

const PORT = 9651;
let project = '';
let server: RunningServer | undefined;

beforeAll(async () => {
  project = mkdtempSync(join(tmpdir(), 'tracker-cli-'));
  mkdirSync(join(project, 'tools/tracker'), { recursive: true });
  writeFileSync(
    join(project, 'tools/tracker/tracker.config.json'),
    JSON.stringify({ port: PORT, resources: ['e2e'] }),
  );
  server = await startServer(join(project, 'tools/tracker/tracker.config.json'));
});

afterAll(async () => {
  await server?.close();
  rmSync(project, { recursive: true, force: true });
});

const cli = (
  args: string[],
  env: Record<string, string> = {},
  cwd = project,
): ReturnType<typeof runCli> => runCli(args, env, cwd);

describe('CLI (ADR 0011, 0026)', () => {
  it('lists the commands of the catalogue', async () => {
    const { code, out } = await cli(['help']);
    expect(code).toBe(0);
    expect(out).toMatch(/create-ticket/);
    expect(out).toMatch(/report-progress/);
    expect(out).toMatch(/usage-summary/);
    expect(out).toMatch(/request-backend/);
  });

  it('runs a command as the developer, with the token found next to the project database', async () => {
    const { code, out } = await cli(['create-ticket', '--title', 'Search by customer name']);
    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual({ key: 'LOC-1' });
  });

  it('finds the project from a sub-folder', async () => {
    mkdirSync(join(project, 'src/deep'), { recursive: true });
    const { code } = await cli(['list-tickets'], {}, join(project, 'src/deep'));
    expect(code).toBe(0);
  });

  it('takes the key as first word and nested fields with a dot', async () => {
    const { code, out } = await cli([
      'report-progress',
      'LOC-1',
      '--progress.state',
      'inProgress',
      '--progress.note',
      'form done',
    ]);
    expect(code).toBe(0);
    expect(JSON.parse(out)).toMatchObject({
      situation: { progress: { state: 'inProgress', note: 'form done' } },
    });
  });

  it('acts as an agent conversation with TRACKER_TOKEN, and is refused what only the developer may do', async () => {
    const introduced = await cli(['introduce', '--name', 'front-1']);
    const { token } = JSON.parse(introduced.out) as { token: string };
    const env = { TRACKER_TOKEN: token, TRACKER_URL: `http://127.0.0.1:${String(PORT)}` };
    expect((await cli(['take-ticket', 'LOC-1', '--role', 'front'], env)).code).toBe(0);
    const refused = await cli(['close-ticket', 'LOC-1'], env);
    expect(refused.code).toBe(1);
    expect(refused.err).toMatch(/développeur/);
  });

  it('repeats an option to give a list', async () => {
    await cli(['create-ticket', '--title', 'Export orders']);
    const { code, out } = await cli([
      'deliver-batch',
      '--name',
      'Delivery of 20 Oct',
      '--keys',
      'LOC-1',
      '--keys',
      'LOC-2',
    ]);
    expect(code).toBe(0);
    expect(JSON.parse(out)).toMatchObject({ keys: ['LOC-1', 'LOC-2'] });
  });

  it('names the wrong field of the input', async () => {
    const { code, err } = await cli(['change-phase', 'LOC-1', '--phase', 'nowhere']);
    expect(code).toBe(1);
    expect(err).toMatch(/phase/);
  });

  it('says how to start the server when it does not answer', async () => {
    const { code, err } = await cli(['list-tickets'], {
      TRACKER_URL: 'http://127.0.0.1:9659',
      TRACKER_TOKEN: 'x',
    });
    expect(code).toBe(1);
    expect(err).toMatch(/ne répond pas/);
  });

  it('reports the files the ticket changes in its git folder, and the tickets that touch them too', async () => {
    const repo = join(project, 'repo');
    mkdirSync(repo);
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
    };
    git('init', '-q', '-b', 'main');
    writeFileSync(join(repo, 'list.ts'), 'a\n');
    git('add', '.');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.test', 'commit', '-qm', 'base');
    git('checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'list.ts'), 'b\n');
    writeFileSync(join(repo, 'new.ts'), 'c\n');
    await cli(['report-changed-files', 'LOC-1', '--base', 'main'], {}, repo);
    const second = await cli(['report-changed-files', 'LOC-2', '--base', 'main'], {}, repo);
    expect(JSON.parse(second.out)).toEqual({
      overlaps: [
        { path: 'list.ts', keys: ['LOC-1'] },
        { path: 'new.ts', keys: ['LOC-1'] },
      ],
    });
  });

  it('runs a command while holding a shared resource, then gives it back, and exits with its code', async () => {
    await cli(['create-ticket', '--title', 'Run the e2e tests']);
    const { code } = await cli([
      'resource',
      'run',
      'e2e',
      '--key',
      'LOC-1',
      '--',
      'node',
      '-e',
      'process.exit(3)',
    ]);
    expect(code).toBe(3);
    const after = await cli(['acquire-resource', '--key', 'LOC-1', '--resource', 'e2e']);
    expect(JSON.parse(after.out)).toMatchObject({ granted: true });
    await cli(['release-resource', '--key', 'LOC-1', '--resource', 'e2e']);
  });

  it('makes a second ticket wait until the first gives the resource back (ADR 0008, 0034)', async () => {
    await cli(['create-ticket', '--title', 'Run the e2e tests too']);
    const marks = join(project, 'marks.txt');
    const mark = (label: string, ms: number): string[] => [
      'node',
      '-e',
      `const fs=require('fs');fs.appendFileSync(${JSON.stringify(marks)},'${label}-start\\n');setTimeout(()=>fs.appendFileSync(${JSON.stringify(marks)},'${label}-end\\n'),${String(ms)})`,
    ];
    const first = cli(['resource', 'run', 'e2e', '--key', 'LOC-1', '--', ...mark('a', 1500)]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const second = cli(['resource', 'run', 'e2e', '--key', 'LOC-2', '--', ...mark('b', 10)]);
    await Promise.all([first, second]);
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(marks, 'utf8').trim().split('\n')).toEqual([
      'a-start',
      'a-end',
      'b-start',
      'b-end',
    ]);
  });

  it('explains how to call resource run when the command is missing', async () => {
    const { code, err } = await cli(['resource', 'run', 'e2e', '--key', 'LOC-1']);
    expect(code).toBe(1);
    expect(err).toMatch(/tracker resource run <ressource>/);
  });

  it('attaches a file to a ticket and notes it in the journal (ADR 0035)', async () => {
    const file = join(project, 'capture.png');
    writeFileSync(file, 'fake image');
    const { code, out } = await cli([
      'attach',
      'LOC-1',
      'capture.png',
      '--message',
      'The cut button',
    ]);
    expect(code).toBe(0);
    expect(out).toMatch(/capture\.png jointe à LOC-1/);
    const ticket = JSON.parse((await cli(['get-ticket', 'LOC-1'])).out) as {
      attachments: { name: string }[];
      entries: { body: string }[];
    };
    expect(ticket.attachments.map((a) => a.name)).toContain('capture.png');
    expect(ticket.entries.at(-1)?.body).toBe('The cut button');
  });
});

describe('changed files of a project with several repositories (ADR 0040)', () => {
  const MULTI_PORT = 9652;
  let root = '';
  let multi: RunningServer | undefined;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'tracker-repos-'));
    mkdirSync(join(root, 'tools/tracker'), { recursive: true });
    writeFileSync(
      join(root, 'tools/tracker/tracker.config.json'),
      JSON.stringify({
        port: MULTI_PORT,
        repos: [
          { name: 'front', path: 'web' },
          { name: 'back', path: 'api' },
        ],
      }),
    );
    multi = await startServer(join(root, 'tools/tracker/tracker.config.json'));
    for (const [folder, file] of [
      ['web', 'list.ts'],
      ['api', 'orders.ts'],
    ] as const) {
      const repo = join(root, folder);
      mkdirSync(repo);
      const git = (...args: string[]): void => {
        execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
      };
      git('init', '-q', '-b', 'main');
      writeFileSync(join(repo, file), 'a\n');
      git('add', '.');
      git('-c', 'user.name=t', '-c', 'user.email=t@example.test', 'commit', '-qm', 'base');
      writeFileSync(join(repo, file), 'b\n');
    }
  });

  afterAll(async () => {
    await multi?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('reports the changed files of every repository, from the project root', async () => {
    await runCli(['create-ticket', '--title', 'Change both sides'], {}, root);
    await runCli(['report-changed-files', 'LOC-1', '--base', 'main'], {}, root);
    const ticket = JSON.parse((await runCli(['get-ticket', 'LOC-1'], {}, root)).out) as {
      changedFiles: { path: string; repo: string | null }[];
    };
    expect(ticket.changedFiles).toEqual([
      { path: 'api/orders.ts', repo: 'back', sharedWith: [] },
      { path: 'web/list.ts', repo: 'front', sharedWith: [] },
    ]);
  });
});
