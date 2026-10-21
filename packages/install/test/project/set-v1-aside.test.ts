import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { setV1AsideAndInstall } from '../../src/project/set-v1-aside';

const folders: string[] = [];
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-v1-aside-'));
  folders.push(path);
  return path;
};

/** A built dist/, with dummy files. */
const artefact = (): string => {
  const dist = folder();
  for (const file of [
    'server.js',
    'tracker.js',
    'admin.js',
    'start-front.sh',
    'stop-front.sh',
    'package.json',
  ]) {
    writeFileSync(join(dist, file), '');
  }
  for (const dir of ['web', 'claude']) mkdirSync(join(dist, dir));
  writeFileSync(join(dist, 'VERSION'), '2.0.3');
  return dist;
};

const NOW = '2026-10-21T10:00:00.000Z';
const V1_HOOK = (args: string): { type: string; command: string } => ({
  type: 'command',
  command: `node "/home/dev/shop/tools/tracker/tracker.mjs" ${args}`,
});
const OWN_HOOK = { type: 'command', command: 'echo done' };

/** A project with V1 installed: its folder, hooks, slash commands and blocks, beside the project\'s own. */
function projectWithV1(): string {
  const root = folder();
  const write = (path: string, text: string): void => {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write('tools/tracker/tracker.mjs', '// V1\n');
  write('tools/tracker/tracker.config.json', JSON.stringify({ version: 2, port: 9610 }));
  write('tools/tracker/projects/demo/items.json', '[]');
  write(
    '.claude/settings.json',
    JSON.stringify({
      permissions: { allow: ['Bash(npm test)'] },
      hooks: {
        SessionStart: [{ hooks: [V1_HOOK('rules --hook')] }],
        Stop: [{ hooks: [V1_HOOK('usage record --hook'), OWN_HOOK] }],
        PreToolUse: [{ hooks: [V1_HOOK('guard --hook')] }],
      },
    }),
  );
  write(
    '.claude/settings.local.json',
    JSON.stringify({ hooks: { SessionEnd: [{ hooks: [V1_HOOK('usage record --hook')] }] } }),
  );
  write('.claude/commands/tracker.md', '<!-- project-tracker command -->\nV1 command\n');
  write('.claude/commands/review.md', "The project's own command\n");
  write(
    '.gitignore',
    'node_modules/\n# project-tracker:start\n/.claude/commands/tracker.md\n# project-tracker:end\ndist/\n',
  );
  write(
    'CLAUDE.md',
    '# Project rules\n\n<!-- project-tracker:start -->\nV1 rules\n<!-- project-tracker:end -->\n',
  );
  return root;
}

const json = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

describe('setting V1 aside without migration (ADR 0049)', () => {
  it('moves the V1 folder to tools/tracker-legacy, untouched, and installs V2 on its port', async () => {
    const root = projectWithV1();
    const report = await setV1AsideAndInstall({ root, artefactDir: artefact(), now: NOW });
    expect(readFileSync(join(root, 'tools/tracker-legacy/tracker.mjs'), 'utf8')).toBe('// V1\n');
    expect(existsSync(join(root, 'tools/tracker-legacy/projects/demo/items.json'))).toBe(true);
    expect(readFileSync(join(root, 'tools/tracker/app/VERSION'), 'utf8')).toBe('2.0.3');
    expect(json(join(root, 'tools/tracker/tracker.config.json'))).toEqual({ port: 9610 });
    expect(report.join('\n')).toContain('tools/tracker-legacy');
  });

  it("takes the V1 hooks, commands and blocks out, and keeps the project's own", async () => {
    const root = projectWithV1();
    await setV1AsideAndInstall({ root, artefactDir: artefact(), now: NOW });
    const settings = readFileSync(join(root, '.claude/settings.json'), 'utf8');
    expect(settings).not.toContain('tracker.mjs');
    expect(settings).toContain('echo done');
    expect(settings).toContain('Bash(npm test)');
    expect(settings).toContain('tools/tracker/app/claude/session-start.js');
    expect(existsSync(join(root, '.claude/settings.local.json'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/tracker.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/review.md'))).toBe(true);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe('node_modules/\ndist/\n');
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe('# Project rules\n');
  });

  it('refuses when tools/tracker-legacy already exists, and changes nothing', async () => {
    const root = projectWithV1();
    mkdirSync(join(root, 'tools/tracker-legacy'));
    await expect(setV1AsideAndInstall({ root, artefactDir: artefact(), now: NOW })).rejects.toThrow(
      /tracker-legacy/,
    );
    expect(existsSync(join(root, 'tools/tracker/tracker.mjs'))).toBe(true);
    expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toContain('tracker.mjs');
  });

  it('refuses a project without V1', async () => {
    const root = folder();
    await expect(setV1AsideAndInstall({ root, artefactDir: artefact(), now: NOW })).rejects.toThrow(
      /No V1/,
    );
  });
});
