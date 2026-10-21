import { execFileSync, spawnSync } from 'node:child_process';
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
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-scripts-'));
  folders.push(path);
  return path;
};

// Stand-ins for the built programs: each one writes down how it was called.
const FAKE_INSTALL = `import { existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root = process.argv[process.argv.indexOf('--root') + 1];
const tracker = join(root, 'tools', 'tracker');
mkdirSync(join(tracker, 'app'), { recursive: true });
cpSync(join(dirname(process.argv[1]), 'VERSION'), join(tracker, 'app', 'VERSION'));
if (!existsSync(join(tracker, 'tracker.config.json'))) {
  writeFileSync(join(tracker, 'tracker.config.json'), JSON.stringify({ port: 9620 }));
}
writeFileSync(join(tracker, 'install-args.json'), JSON.stringify(process.argv.slice(2)));
`;
const FAKE_PROGRAM = `import { writeFileSync } from 'node:fs';
writeFileSync(process.env.CALLED, JSON.stringify({ args: process.argv.slice(2), env: process.env }));
`;

/** A release as GitHub serves it: the archive, its checksum, and the install scripts. */
function release(version: string, { corrupt = false } = {}): string {
  const build = join(folder(), 'project-tracker');
  mkdirSync(build);
  writeFileSync(join(build, 'VERSION'), `${version}\n`);
  writeFileSync(join(build, 'install.js'), FAKE_INSTALL);
  writeFileSync(join(build, 'launcher.js'), FAKE_PROGRAM);
  writeFileSync(join(build, 'hold.js'), '');
  for (const script of ['start-front.sh', 'start-back.sh']) {
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

function run(script: string, env: Record<string, string>): { code: number; out: string } {
  const done = spawnSync('bash', [join(SCRIPTS, script)], {
    env: { PATH: process.env.PATH ?? '', HOME: folder(), PROJECT_TRACKER_YES: '1', ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: done.status ?? 1, out: `${done.stdout}${done.stderr}` };
}

const json = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

describe('install-front.sh (ADR 0046)', () => {
  it('installs the release into the project, with Jira and a back-end on the private network', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_ROOT: root,
      PROJECT_TRACKER_PORT: '9644',
      PROJECT_TRACKER_JIRA_URL: 'https://jira.example.test',
      PROJECT_TRACKER_JIRA_PROJECT: 'PROJ',
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
        emailEnv: 'JIRA_EMAIL',
        tokenEnv: 'JIRA_TOKEN',
      },
      privateAddresses: ['100.64.0.1'],
      launcherTokenEnv: 'TRACKER_LAUNCHER_TOKEN',
    });
    expect(out).toContain('tools/tracker/app/start-front.sh');
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

  it('refuses an archive whose checksum does not match, and installs nothing', () => {
    const root = folder();
    const { code, out } = run('install-front.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0', { corrupt: true }),
      PROJECT_TRACKER_ROOT: root,
    });
    expect(code).not.toBe(0);
    expect(out).toMatch(/empreinte/);
    expect(existsSync(join(root, 'tools'))).toBe(false);
  });
});

describe('start-front.sh (ADR 0046)', () => {
  /** A project as install.js leaves it, with a stand-in server. */
  function project(config: Record<string, unknown>): string {
    const root = folder();
    const app = join(root, 'tools/tracker/app');
    mkdirSync(app, { recursive: true });
    copyFileSync(join(SCRIPTS, 'start-front.sh'), join(app, 'start-front.sh'));
    writeFileSync(join(app, 'server.js'), FAKE_PROGRAM);
    writeFileSync(join(root, 'tools/tracker/tracker.config.json'), JSON.stringify(config));
    return root;
  }

  const JIRA = {
    baseUrl: 'https://jira.example.test',
    project: 'PROJ',
    emailEnv: 'JIRA_EMAIL',
    tokenEnv: 'JIRA_TOKEN',
  };

  it('makes the launcher token once, keeps it in secrets.env readable by the developer only, and starts the server', () => {
    const root = project({ port: 9620, launcherTokenEnv: 'TRACKER_LAUNCHER_TOKEN' });
    const called = join(root, 'called.json');
    const { code, out } = spawnStart(root, { CALLED: called });
    expect(code, out).toBe(0);
    const secrets = join(root, 'tools/tracker/secrets.env');
    expect(statSync(secrets).mode & 0o777).toBe(0o600);
    const token = /TRACKER_LAUNCHER_TOKEN='?([0-9a-f]{64})/.exec(
      readFileSync(secrets, 'utf8'),
    )?.[1];
    expect(token).toBeDefined();
    expect(out).toContain(token);
    const server = json(called) as { args: string[]; env: Record<string, string> };
    expect(server.args).toEqual([join(root, 'tools/tracker/tracker.config.json')]);
    expect(server.env.TRACKER_LAUNCHER_TOKEN).toBe(token);

    const again = spawnStart(root, { CALLED: called });
    expect(again.out).not.toContain(token);
    expect((json(called) as { env: Record<string, string> }).env.TRACKER_LAUNCHER_TOKEN).toBe(
      token,
    );
  });

  it('takes the Jira credentials from the environment first', () => {
    const root = project({ port: 9620, jira: JIRA });
    writeFileSync(
      join(root, 'tools/tracker/secrets.env'),
      "JIRA_EMAIL='file@example.test'\nJIRA_TOKEN='from-file'\n",
    );
    const called = join(root, 'called.json');
    const { code } = spawnStart(root, { CALLED: called, JIRA_TOKEN: 'from-env' });
    expect(code).toBe(0);
    const { env } = json(called) as { env: Record<string, string> };
    expect(env.JIRA_EMAIL).toBe('file@example.test');
    expect(env.JIRA_TOKEN).toBe('from-env');
  });

  it('stops with a clear message when a secret is missing and nobody can answer', () => {
    const root = project({ port: 9620, jira: JIRA });
    const { code, out } = spawnStart(root, { CALLED: join(root, 'called.json') });
    expect(code).not.toBe(0);
    expect(out).toContain('JIRA_EMAIL');
    expect(existsSync(join(root, 'called.json'))).toBe(false);
  });

  function spawnStart(root: string, env: Record<string, string>): { code: number; out: string } {
    const done = spawnSync('bash', [join(root, 'tools/tracker/app/start-front.sh')], {
      env: { PATH: process.env.PATH ?? '', HOME: root, PROJECT_TRACKER_YES: '1', ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: done.status ?? 1, out: `${done.stdout}${done.stderr}` };
  }
});

describe('install-back.sh and start-back.sh (ADR 0046)', () => {
  const answers = (dir: string, mirror: string): Record<string, string> => ({
    PROJECT_TRACKER_DIR: dir,
    PROJECT_TRACKER_URL: 'http://100.64.0.1:9620',
    PROJECT_TRACKER_MIRROR: mirror,
  });

  it('installs the launcher and writes its configuration from the answers', () => {
    const dir = join(folder(), 'back');
    const mirror = folder();
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      ...answers(dir, mirror),
      PROJECT_TRACKER_MAX_PARALLEL: '2',
    });
    expect(code, out).toBe(0);
    for (const file of ['launcher.js', 'hold.js', 'start-back.sh', 'VERSION']) {
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
    run('install-back.sh', { PROJECT_TRACKER_BASE_URL: release('2.0.0'), ...answers(dir, mirror) });
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

  it('refuses a new install without the address of the tool when nobody can answer', () => {
    const dir = join(folder(), 'back');
    const { code, out } = run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      PROJECT_TRACKER_DIR: dir,
    });
    expect(code).not.toBe(0);
    expect(out).toMatch(/adresse/i);
  });

  it('starts the launcher with the token from secrets.env, and stops clearly without one', () => {
    const dir = join(folder(), 'back');
    run('install-back.sh', {
      PROJECT_TRACKER_BASE_URL: release('2.1.0'),
      ...answers(dir, folder()),
    });
    const called = join(dir, 'called.json');
    const start = (): { code: number; out: string } => {
      const done = spawnSync('bash', [join(dir, 'start-back.sh')], {
        env: { PATH: process.env.PATH ?? '', HOME: dir, PROJECT_TRACKER_YES: '1', CALLED: called },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: done.status ?? 1, out: `${done.stdout}${done.stderr}` };
    };
    const missing = start();
    expect(missing.code).not.toBe(0);
    expect(missing.out).toContain('TRACKER_LAUNCHER_TOKEN');

    writeFileSync(join(dir, 'secrets.env'), "TRACKER_LAUNCHER_TOKEN='abc'\n");
    expect(start().code).toBe(0);
    const launcher = json(called) as { args: string[]; env: Record<string, string> };
    expect(launcher.args).toEqual([join(dir, 'launcher.config.json')]);
    expect(launcher.env.TRACKER_LAUNCHER_TOKEN).toBe('abc');
  });
});
