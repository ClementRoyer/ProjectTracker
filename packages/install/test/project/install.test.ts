import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { installProject } from '../../src/project/install';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-install-'));
  folders.push(path);
  return path;
};

/** A built dist/ of the given version, with dummy files. */
const artefact = (version: string): string => {
  const dist = folder();
  for (const file of ['server.js', 'tracker.js', 'admin.js']) writeFileSync(join(dist, file), '');
  mkdirSync(join(dist, 'web'));
  writeFileSync(join(dist, 'web', 'index.html'), version);
  mkdirSync(join(dist, 'claude'));
  writeFileSync(join(dist, 'claude', 'stop.js'), '');
  writeFileSync(join(dist, 'VERSION'), version);
  writeFileSync(join(dist, 'launcher.js'), '');
  writeFileSync(join(dist, 'start-front.sh'), '');
  writeFileSync(join(dist, 'stop-front.sh'), '');
  writeFileSync(join(dist, 'start-back.sh'), '');
  writeFileSync(join(dist, 'package.json'), '{"type":"module"}');
  return dist;
};

const NOW = '2026-10-20T10:00:00.000Z';
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

describe('installing the tool in a project (ADR 0030)', () => {
  it('copies the tool into tools/tracker/app, and only what a project runs', async () => {
    const root = folder();
    await installProject({ root, artefactDir: artefact('2.0.0'), port: 9640, now: NOW });
    const app = join(root, 'tools', 'tracker', 'app');
    expect(readdirSync(app).sort()).toEqual([
      'VERSION',
      'admin.js',
      'claude',
      'package.json',
      'server.js',
      'start-front.sh',
      'stop-front.sh',
      'tracker.js',
      'web',
    ]);
  });

  it('writes a configuration with the chosen port, and keeps the data out of git', async () => {
    const root = folder();
    await installProject({ root, artefactDir: artefact('2.0.0'), port: 9640, now: NOW });
    expect(read(join(root, 'tools', 'tracker', 'tracker.config.json'))).toEqual({ port: 9640 });
    const ignored = readFileSync(join(root, 'tools', 'tracker', '.gitignore'), 'utf8');
    for (const entry of [
      'app/',
      '*.db',
      'backups/',
      'developer.token',
      'secrets.env',
      'server.log',
      'server.pid',
    ]) {
      expect(ignored).toContain(entry);
    }
  });

  it('plugs Claude Code into the tracker of this project', async () => {
    const root = folder();
    await installProject({ root, artefactDir: artefact('2.0.0'), port: 9640, now: NOW });
    const settings = JSON.stringify(read(join(root, '.claude', 'settings.json')));
    expect(settings).toContain('http://127.0.0.1:9640');
    expect(settings).toContain('session-start.js');
    expect(JSON.stringify(read(join(root, '.mcp.json')))).toContain('http://127.0.0.1:9640/mcp');
  });

  it('tells how to start, where the page is, and how other agents connect', async () => {
    const root = folder();
    const report = await installProject({
      root,
      artefactDir: artefact('2.0.0'),
      port: 9640,
      now: NOW,
    });
    const text = report.join('\n');
    expect(text).toContain('tools/tracker/app/start-front.sh');
    expect(text).toContain('http://127.0.0.1:9640/mcp');
    expect(text).toContain('node tools/tracker/app/tracker.js');
  });

  it('updates an installed project: the database is saved first, the configuration and data stay', async () => {
    const root = folder();
    await installProject({ root, artefactDir: artefact('2.0.0'), port: 9640, now: NOW });
    const database = join(root, 'tools', 'tracker', 'tracker.db');
    const db = openDatabase(database);
    db.prepare("INSERT INTO developer (lastVisitAt) VALUES ('kept')").run();
    db.close();

    const report = await installProject({ root, artefactDir: artefact('2.0.1'), now: NOW });
    expect(readFileSync(join(root, 'tools', 'tracker', 'app', 'VERSION'), 'utf8')).toBe('2.0.1');
    expect(read(join(root, 'tools', 'tracker', 'tracker.config.json'))).toEqual({ port: 9640 });
    const backups = readdirSync(join(root, 'tools', 'tracker', 'backups'));
    expect(backups).toHaveLength(1);
    const saved = new DatabaseSync(
      join(root, 'tools', 'tracker', 'backups', backups[0] ?? '', 'tracker.db'),
    );
    expect(saved.prepare('SELECT lastVisitAt FROM developer').get()).toEqual({
      lastVisitAt: 'kept',
    });
    saved.close();
    expect(report.join('\n')).toContain('2.0.0 → 2.0.1');
  });

  it('keeps the port of an existing configuration, and says so', async () => {
    const root = folder();
    await installProject({ root, artefactDir: artefact('2.0.0'), port: 9640, now: NOW });
    const report = await installProject({
      root,
      artefactDir: artefact('2.0.0'),
      port: 9650,
      now: NOW,
    });
    expect(read(join(root, 'tools', 'tracker', 'tracker.config.json'))).toEqual({ port: 9640 });
    expect(report.join('\n')).toContain('9640');
  });

  it('refuses a folder that holds something else than a V2, so that nothing is overwritten', async () => {
    const root = folder();
    mkdirSync(join(root, 'tools', 'tracker'), { recursive: true });
    writeFileSync(join(root, 'tools', 'tracker', 'notes.txt'), 'mine');
    await expect(
      installProject({ root, artefactDir: artefact('2.0.0'), now: NOW }),
    ).rejects.toThrow(/tools\/tracker/);
    expect(existsSync(join(root, 'tools', 'tracker', 'app'))).toBe(false);
  });

  it('notes the project in the registry of the machine, for the project menu (ADR 0039)', async () => {
    const root = folder();
    const registry = join(folder(), 'projects.json');
    await installProject({
      root,
      artefactDir: artefact('2.0.0'),
      port: 9640,
      now: NOW,
      registryFile: registry,
    });
    expect(read(registry)).toEqual([{ name: basename(root), url: 'http://127.0.0.1:9640', root }]);
  });
});
