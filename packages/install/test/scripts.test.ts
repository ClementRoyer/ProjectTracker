import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPTS = resolve(import.meta.dirname, '..', '..', '..', 'scripts');

const folders: string[] = [];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  for (const path of folders.splice(0)) {
    // What a test left running in the background goes with its folder.
    for (const pidfile of ['tools/tracker/server.pid', 'back/launcher.pid', 'launcher.pid']) {
      const file = join(path, pidfile);
      if (existsSync(file)) spawnSync('kill', [readFileSync(file, 'utf8').trim()]);
    }
    rmSync(path, { recursive: true, force: true });
  }
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-scripts-'));
  folders.push(path);
  return path;
};

// Stand-ins for the built programs. The server answers on the port of its configuration and leaves, next to it,
// how it was called; the launcher writes how it was called to $CALLED and stays up; the CLI answers the Jira pre-fetch.
const FAKE_SERVER = `const fs = require('node:fs');
const config = process.argv[2];
fs.writeFileSync(config + '.started', JSON.stringify({ args: process.argv.slice(2), env: process.env }));
const { port } = JSON.parse(fs.readFileSync(config, 'utf8'));
require('node:http').createServer((q, r) => r.end('ok')).listen(port, '127.0.0.1');
`;
const FAKE_LAUNCHER = `require('node:fs').writeFileSync(process.env.CALLED, JSON.stringify({ args: process.argv.slice(2), env: process.env }));
setInterval(() => {}, 1000);
`;
const FAKE_CLI = `const fs = require('node:fs');
if (process.argv[2] === 'preview-jira-load') console.log(JSON.stringify({ read: 5, created: ['S4-1', 'S4-2'] }));
if (process.argv[2] === 'load-from-jira') fs.writeFileSync('tools/tracker/loaded', '');
`;
const FAKE_INSTALL = `const FAKE_SERVER = ${JSON.stringify(FAKE_SERVER)};
import { existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.argv[process.argv.indexOf('--root') + 1];
const tracker = join(root, 'tools', 'tracker');
mkdirSync(join(tracker, 'app'), { recursive: true });
for (const file of ['VERSION', 'start-front.sh', 'stop-front.sh', 'tracker.js']) {
  cpSync(join(dirname(process.argv[1]), file), join(tracker, 'app', file));
}
writeFileSync(join(tracker, 'app', 'server.js'), FAKE_SERVER);
const port = process.argv.includes('--port') ? Number(process.argv[process.argv.indexOf('--port') + 1]) : 9620;
if (!existsSync(join(tracker, 'tracker.config.json'))) {
  writeFileSync(join(tracker, 'tracker.config.json'), JSON.stringify({ port }));
}
writeFileSync(join(tracker, 'install-args.json'), JSON.stringify(process.argv.slice(2)));
`;

/** A release as GitHub serves it: the archive, its checksum, and the install scripts. */
function release(version: string, { corrupt = false } = {}): string {
  const build = join(folder(), 'project-tracker');
  mkdirSync(build);
  writeFileSync(join(build, 'VERSION'), `${version}\n`);
  writeFileSync(join(build, 'install.js'), FAKE_INSTALL);
  writeFileSync(join(build, 'launcher.js'), FAKE_LAUNCHER);
  writeFileSync(join(build, 'tracker.js'), FAKE_CLI);
  writeFileSync(join(build, 'hold.js'), '');
  writeFileSync(join(build, 'package.json'), '{}');
  for (const script of ['start-front.sh', 'stop-front.sh', 'start-back.sh', 'stop-back.sh']) {
    copyFileSync(join(SCRIPTS, script), join(build, script));
  }
  const out = folder();
  execFileSync('tar', [
    '-czf',
    join(out, 'project-tracker.tar.gz'),
    '-C',
    join(build, '..'),
    'project-tracker',
  ]);
  const sum = execFileSync('sha256sum', ['project-tracker.tar.gz'], { cwd: out, encoding: 'utf8' });
  writeFileSync(
    join(out, 'SHA256SUMS'),
    corrupt ? sum.replace(/^./, sum.startsWith('0') ? '1' : '0') : sum,
  );
  return `file://${out}`;
}

/** Runs a script with no terminal: the variables and the defaults answer. */
function run(path: string, env: Record<string, string>): { code: number; out: string } {
  const done = spawnSync('bash', [path.includes('/') ? path : join(SCRIPTS, path)], {
    env: {
      PATH: process.env.PATH ?? '',
      HOME: folder(),
      PROJECT_TRACKER_YES: '1',
      PROJECT_TRACKER_NO_START: '1',
      ...env,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: done.status ?? 1, out: `${done.stdout}${done.stderr}` };
}

const answers = (url: string): boolean =>
  spawnSync('curl', ['-fsS', '-o', '/dev/null', url]).status === 0;

/** A foreign process that stays up while the test runs. */
function background(command: string, args: string[]): void {
  const child = spawn(command, args, { stdio: 'ignore' });
  stops.push(() => child.kill());
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let tries = 0; tries < 50 && !check(); tries += 1) {
    await new Promise((done) => setTimeout(done, 100));
  }
}

const json = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
const pidOf = (file: string): string => readFileSync(file, 'utf8').trim();
const alive = (pid: string): boolean => spawnSync('kill', ['-0', pid]).status === 0;

describe('install-front.sh (ADR 0046, 0052)', () => {
  it('installs the release into the project, with Jira, its parent tickets and a back-end', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_PORT: '9644',
      PROJECT_TRACKER_JIRA_URL: 'https://jira.example.test',
      PROJECT_TRACKER_JIRA_PROJECT: 'PROJ',
      PROJECT_TRACKER_JIRA_PARENTS: 'proj-120, PROJ-130',
      PROJECT_TRACKER_PRIVATE_ADDRESS: '100.64.0.1',
    });
    expect(code, out).toBe(0);
    expect(json(join(root, 'tools/tracker/install-args.json'))).toEqual([
      '--root',
      root,
      '--port',
      '9644',
    ]);
    expect(json(join(root, 'tools/tracker/tracker.config.json'))).toMatchObject({
      jira: {
        baseUrl: 'https://jira.example.test',
        project: 'PROJ',
        parents: ['PROJ-120', 'PROJ-130'],
        emailEnv: 'JIRA_EMAIL',
        tokenEnv: 'JIRA_TOKEN',
      },
      privateAddresses: ['100.64.0.1'],
      launcherTokenEnv: 'TRACKER_LAUNCHER_TOKEN',
    });
    expect(out).toContain('tools/tracker/app/start-front.sh');
    expect(out).toContain('http://127.0.0.1:9644');
  });

  it('proposes a port no other project of the registry uses (ADR 0052)', () => {
    const root = folder();
    const registry = join(folder(), 'projects.json');
    writeFileSync(
      registry,
      JSON.stringify([{ name: 'other', url: 'http://127.0.0.1:9620', root: '/x' }]),
    );
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      TRACKER_REGISTRY: registry,
    });
    expect(code, out).toBe(0);
    const [, , , port] = json(join(root, 'tools/tracker/install-args.json')) as unknown as string[];
    expect(Number(port)).toBeGreaterThan(9620);
  });

  it('updates an installed project without asking the setup questions again', () => {
    const root = folder();
    run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.0.0'),
      PROJECT_TRACKER_ROOT: root,
    });
    const config = readFileSync(join(root, 'tools/tracker/tracker.config.json'), 'utf8');
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_JIRA_URL: 'https://jira.example.test',
    });
    expect(code, out).toBe(0);
    expect(out).toMatch(/2\.0\.0 → 2\.1\.0/);
    expect(json(join(root, 'tools/tracker/install-args.json'))).toEqual(['--root', root]);
    expect(readFileSync(join(root, 'tools/tracker/tracker.config.json'), 'utf8')).toBe(config);
  });

  it('sets a V1 aside before installing, on the port of V1 (ADR 0049)', () => {
    const root = folder();
    mkdirSync(join(root, 'tools/tracker'), { recursive: true });
    writeFileSync(join(root, 'tools/tracker/tracker.mjs'), '// V1\n');
    writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify({ port: 9610 }));
    // A real V1 has its own app/VERSION, which is no V2 to update.
    mkdirSync(join(root, 'tools/tracker/app'));
    writeFileSync(join(root, 'tools/tracker/app/VERSION'), '1.2.0\n');
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
    });
    expect(code, out).toBe(0);
    expect(out).toContain('V1');
    expect(json(join(root, 'tools/tracker/install-args.json'))).toEqual([
      '--root',
      root,
      '--port',
      '9610',
      '--set-v1-aside',
    ]);
  });

  it('leaves a V1 in place, and installs nothing, when told not to set it aside', () => {
    const root = folder();
    mkdirSync(join(root, 'tools/tracker'), { recursive: true });
    writeFileSync(join(root, 'tools/tracker/tracker.mjs'), '// V1\n');
    writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify({ port: 9610 }));
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_SET_V1_ASIDE: 'no',
    });
    expect(code).not.toBe(0);
    expect(out).toMatch(/V1 kept/);
    expect(existsSync(join(root, 'tools/tracker/install-args.json'))).toBe(false);
  });

  it('starts the server in the background, gives the prompt back and the dashboard URL (ADR 0050, 0052)', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_PORT: '9666',
      PROJECT_TRACKER_NO_START: '',
    });
    expect(code, out).toBe(0);
    expect(out).toContain('Dashboard: http://127.0.0.1:9666');
    expect(answers('http://127.0.0.1:9666/')).toBe(true);
    expect(run(join(root, 'tools/tracker/app/stop-front.sh'), {}).out).toMatch(/stopped/);
    expect(answers('http://127.0.0.1:9666/')).toBe(false);
  });

  it('stops the running server for an update, and starts the new one', () => {
    const root = folder();
    const install = (version: string): { code: number; out: string } =>
      run('install-front.sh', {
        PROJECT_TRACKER_BASE_URL: release(version),
        PROJECT_TRACKER_ROOT: root,
        PROJECT_TRACKER_PORT: '9667',
        PROJECT_TRACKER_NO_START: '',
      });
    install('2.0.0');
    const before = pidOf(join(root, 'tools/tracker/server.pid'));
    const { code, out } = install('2.1.0');
    expect(code, out).toBe(0);
    expect(out).toMatch(/stopped for the update/);
    expect(alive(before)).toBe(false);
    expect(answers('http://127.0.0.1:9667/')).toBe(true);
  });

  it('counts the Jira tickets of a new install and loads them on request (ADR 0052)', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_PORT: '9668',
      PROJECT_TRACKER_JIRA_URL: 'https://jira.example.test',
      PROJECT_TRACKER_JIRA_PROJECT: 'S4',
      PROJECT_TRACKER_NO_START: '',
      JIRA_EMAIL: 'dev@example.test',
      JIRA_TOKEN: 'token',
    });
    expect(code, out).toBe(0);
    expect(out).toContain('5 tickets are assigned to you in Jira, 2 of them new here.');
    expect(existsSync(join(root, 'tools/tracker/loaded'))).toBe(true);
  });

  it('finds the git repositories of a project folder that is not one, and declares them (ADR 0054)', () => {
    const root = folder();
    for (const repo of ['apps/billing', 'apps/shop', 'shared']) {
      mkdirSync(join(root, repo), { recursive: true });
      execFileSync('git', ['init', '-q'], { cwd: join(root, repo) });
    }
    mkdirSync(join(root, 'node_modules/lib'), { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: join(root, 'node_modules/lib') });
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
    });
    expect(code, out).toBe(0);
    expect(out).toContain('apps/billing');
    expect(json(join(root, 'tools/tracker/tracker.config.json')).repos).toEqual([
      { name: 'billing', path: 'apps/billing' },
      { name: 'shop', path: 'apps/shop' },
      { name: 'shared', path: 'shared' },
    ]);

    mkdirSync(join(root, 'apps/admin'));
    execFileSync('git', ['init', '-q'], { cwd: join(root, 'apps/admin') });
    run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.2.0'),
      PROJECT_TRACKER_ROOT: root,
    });
    expect(json(join(root, 'tools/tracker/tracker.config.json')).repos).toEqual([
      { name: 'billing', path: 'apps/billing' },
      { name: 'shop', path: 'apps/shop' },
      { name: 'shared', path: 'shared' },
      { name: 'admin', path: 'apps/admin' },
    ]);
  });

  it('declares no repository when the project folder is one, or when told not to', () => {
    const inRepo = folder();
    execFileSync('git', ['init', '-q'], { cwd: inRepo });
    mkdirSync(join(inRepo, 'vendor/lib'), { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: join(inRepo, 'vendor/lib') });
    run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: inRepo,
    });
    expect(json(join(inRepo, 'tools/tracker/tracker.config.json')).repos).toBeUndefined();

    const declined = folder();
    mkdirSync(join(declined, 'app'));
    execFileSync('git', ['init', '-q'], { cwd: join(declined, 'app') });
    run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: declined,
      PROJECT_TRACKER_ADD_REPOS: 'no',
    });
    expect(json(join(declined, 'tools/tracker/tracker.config.json')).repos).toBeUndefined();
  });

  it('refuses an archive whose checksum does not match, and installs nothing', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0', { corrupt: true }),
      PROJECT_TRACKER_ROOT: root,
    });
    expect(code).not.toBe(0);
    expect(out).toMatch(/checksum/);
    expect(existsSync(join(root, 'tools'))).toBe(false);
  });
});

describe('start-front.sh and stop-front.sh (ADR 0046, 0052)', () => {
  /** A project as install.js leaves it, with a stand-in server. */
  function project(config: Record<string, unknown>): string {
    const root = folder();
    const app = join(root, 'tools/tracker/app');
    mkdirSync(app, { recursive: true });
    for (const script of ['start-front.sh', 'stop-front.sh']) {
      copyFileSync(join(SCRIPTS, script), join(app, script));
    }
    writeFileSync(join(app, 'server.js'), FAKE_SERVER);
    writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify(config));
    return root;
  }
  const start = (root: string, env: Record<string, string> = {}): { code: number; out: string } =>
    run(join(root, 'tools/tracker/app/start-front.sh'), env);
  const stop = (root: string): { code: number; out: string } =>
    run(join(root, 'tools/tracker/app/stop-front.sh'), {});
  const started = (root: string): { args: string[]; env: Record<string, string> } =>
    json(join(root, 'tools/tracker/tracker.config.json.started')) as {
      args: string[];
      env: Record<string, string>;
    };

  const JIRA = {
    baseUrl: 'https://jira.example.test',
    project: 'PROJ',
    emailEnv: 'JIRA_EMAIL',
    tokenEnv: 'JIRA_TOKEN',
  };

  it('makes the launcher token once, keeps it in secrets.env readable by the developer only, and starts the server', () => {
    const root = project({ port: 9670, launcherTokenEnv: 'TRACKER_LAUNCHER_TOKEN' });
    const { code, out } = start(root);
    expect(code, out).toBe(0);
    const secrets = join(root, 'tools/tracker/secrets.env');
    expect(statSync(secrets).mode & 0o777).toBe(0o600);
    const token = /TRACKER_LAUNCHER_TOKEN='?([0-9a-f]{64})/.exec(
      readFileSync(secrets, 'utf8'),
    )?.[1];
    expect(token).toBeDefined();
    expect(out).toContain(token);
    expect(started(root).args).toEqual([join(root, 'tools/tracker/tracker.config.json')]);
    expect(started(root).env.TRACKER_LAUNCHER_TOKEN).toBe(token);

    stop(root);
    const again = start(root);
    expect(again.out).not.toContain(token);
    expect(started(root).env.TRACKER_LAUNCHER_TOKEN).toBe(token);
  });

  it('runs one server only, and says so when asked to start it again', () => {
    const root = project({ port: 9671 });
    start(root);
    const pid = pidOf(join(root, 'tools/tracker/server.pid'));
    const again = start(root);
    expect(again.code).toBe(0);
    expect(again.out).toMatch(/already runs/);
    expect(pidOf(join(root, 'tools/tracker/server.pid'))).toBe(pid);
  });

  it('refuses to start when something else answers on the port', async () => {
    const root = project({ port: 9672 });
    background('node', [
      '-e',
      "require('node:http').createServer((q, r) => r.end('ok')).listen(9672, '127.0.0.1')",
    ]);
    await waitFor(() => answers('http://127.0.0.1:9672/'));
    const { code, out } = start(root);
    expect(code).not.toBe(0);
    expect(out).toMatch(/already answers/);
  });

  it('shows only the log lines of this start when the server stops at start', () => {
    const root = project({ port: 9675 });
    writeFileSync(join(root, 'tools/tracker/server.log'), 'line from an earlier start\n');
    writeFileSync(
      join(root, 'tools/tracker/app/server.js'),
      "console.error('Invalid configuration: jira.parents'); process.exit(1);",
    );
    const { code, out } = start(root);
    expect(code).not.toBe(0);
    expect(out).toContain('Invalid configuration: jira.parents');
    expect(out).not.toContain('line from an earlier start');
  });

  it('takes the Jira credentials from the environment first', () => {
    const root = project({ port: 9673, jira: JIRA });
    writeFileSync(
      join(root, 'tools/tracker/secrets.env'),
      "JIRA_EMAIL='file@example.test'\nJIRA_TOKEN='from-file'\n",
    );
    const { code } = start(root, { JIRA_TOKEN: 'from-env' });
    expect(code).toBe(0);
    expect(started(root).env.JIRA_EMAIL).toBe('file@example.test');
    expect(started(root).env.JIRA_TOKEN).toBe('from-env');
  });

  it('stops with a clear message when a secret is missing and nobody can answer', () => {
    const root = project({ port: 9674, jira: JIRA });
    const { code, out } = start(root);
    expect(code).not.toBe(0);
    expect(out).toContain('JIRA_EMAIL');
    expect(existsSync(join(root, 'tools/tracker/tracker.config.json.started'))).toBe(false);
  });
});

describe('install-back.sh, start-back.sh and stop-back.sh (ADR 0046, 0052)', () => {
  const setup = (dir: string, mirror: string): Record<string, string> => ({
    PROJECT_TRACKER_DIR: dir,
    PROJECT_TRACKER_URL: 'http://100.64.0.1:9620',
    PROJECT_TRACKER_MIRROR: mirror,
  });

  it('installs the launcher and writes its configuration from the answers', () => {
    const dir = join(folder(), 'back');
    const mirror = folder();
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      ...setup(dir, mirror),
      PROJECT_TRACKER_MAX_PARALLEL: '2',
    });
    expect(code, out).toBe(0);
    for (const file of [
      'launcher.js',
      'hold.js',
      'start-back.sh',
      'stop-back.sh',
      'package.json',
    ]) {
      expect(existsSync(join(dir, file)), file).toBe(true);
    }
    expect(json(join(dir, 'launcher.config.json'))).toEqual({
      tracker: 'http://100.64.0.1:9620',
      mirror,
      maxParallel: 2,
      command: ['claude', '-p', '--output-format', 'json', '--json-schema', '@SCHEMA@'],
    });
    expect(out).toContain(join(dir, 'start-back.sh'));
  });

  it('keeps the configuration and the secrets when it updates', () => {
    const dir = join(folder(), 'back');
    const mirror = folder();
    run('install-back.sh', { PROJECT_TRACKER_BASE_URL: release('2.0.0'), ...setup(dir, mirror) });
    writeFileSync(
      join(dir, 'launcher.config.json'),
      JSON.stringify({ tracker: 'http://kept', mirror, command: ['x'] }),
    );
    writeFileSync(join(dir, 'secrets.env'), "TRACKER_LAUNCHER_TOKEN='kept'\n");
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_DIR: dir,
    });
    expect(code, out).toBe(0);
    expect(out).toMatch(/2\.0\.0 → 2\.1\.0/);
    expect(readFileSync(join(dir, 'VERSION'), 'utf8').trim()).toBe('2.1.0');
    expect(json(join(dir, 'launcher.config.json')).tracker).toBe('http://kept');
    expect(readFileSync(join(dir, 'secrets.env'), 'utf8')).toContain('kept');
  });

  it('starts the launcher in the background once installed, and stops it on request (ADR 0050, 0052)', () => {
    const dir = join(folder(), 'back');
    const called = join(folder(), 'called.json');
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      ...setup(dir, folder()),
      PROJECT_TRACKER_NO_START: '',
      TRACKER_LAUNCHER_TOKEN: 'abc',
      CALLED: called,
    });
    expect(code, out).toBe(0);
    expect((json(called) as { args: string[] }).args).toEqual([join(dir, 'launcher.config.json')]);
    const pid = pidOf(join(dir, 'launcher.pid'));
    expect(alive(pid)).toBe(true);
    expect(run(join(dir, 'stop-back.sh'), {}).out).toMatch(/stopped/);
    expect(alive(pid)).toBe(false);
  });

  it('stops the running launcher for an update, and starts the new one', () => {
    const dir = join(folder(), 'back');
    const install = (
      version: string,
      more: Record<string, string>,
    ): { code: number; out: string } =>
      run('install-back.sh', {
        PROJECT_TRACKER_BASE_URL: release(version),
        ...more,
        PROJECT_TRACKER_NO_START: '',
        TRACKER_LAUNCHER_TOKEN: 'abc',
        CALLED: join(folder(), 'called.json'),
      });
    install('2.0.0', setup(dir, folder()));
    const before = pidOf(join(dir, 'launcher.pid'));
    const { code, out } = install('2.1.0', { PROJECT_TRACKER_DIR: dir });
    expect(code, out).toBe(0);
    expect(out).toMatch(/stopped for the update/);
    expect(alive(before)).toBe(false);
    expect(alive(pidOf(join(dir, 'launcher.pid')))).toBe(true);
  });

  it('does not start a second launcher next to one started by hand', async () => {
    const dir = join(folder(), 'back');
    run('install-back.sh', { PROJECT_TRACKER_BASE_URL: release('2.0.0'), ...setup(dir, folder()) });
    // Two commands, so that bash stays the process, named after the launcher.
    background('bash', ['-c', 'sleep 30; true', join(dir, 'launcher.js')]);
    await waitFor(() => spawnSync('pgrep', ['-f', join(dir, 'launcher.js')]).status === 0);
    const called = join(folder(), 'called.json');
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_DIR: dir,
      PROJECT_TRACKER_NO_START: '',
      TRACKER_LAUNCHER_TOKEN: 'abc',
      CALLED: called,
    });
    expect(code, out).toBe(0);
    expect(out).toMatch(/started by hand/);
    expect(existsSync(called)).toBe(false);
  });

  it('refuses a new install without the address of the tool when nobody can answer', () => {
    const dir = join(folder(), 'back');
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_DIR: dir,
    });
    expect(code).not.toBe(0);
    expect(out).toMatch(/address/i);
  });

  it('starts the launcher with the token from secrets.env, and stops clearly without one', () => {
    const dir = join(folder(), 'back');
    run('install-back.sh', { PROJECT_TRACKER_BASE_URL: release('2.1.0'), ...setup(dir, folder()) });
    const called = join(folder(), 'called.json');
    const missing = run(join(dir, 'start-back.sh'), { CALLED: called });
    expect(missing.code).not.toBe(0);
    expect(missing.out).toContain('TRACKER_LAUNCHER_TOKEN');

    writeFileSync(join(dir, 'secrets.env'), "TRACKER_LAUNCHER_TOKEN='abc'\n");
    expect(run(join(dir, 'start-back.sh'), { CALLED: called }).code).toBe(0);
    const launcher = json(called) as { args: string[]; env: Record<string, string> };
    expect(launcher.args).toEqual([join(dir, 'launcher.config.json')]);
    expect(launcher.env.TRACKER_LAUNCHER_TOKEN).toBe('abc');
  });
});
