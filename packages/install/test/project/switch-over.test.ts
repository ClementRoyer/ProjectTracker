import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { rollBackToV1, switchOverToV2, type RunV1 } from '../../src/project/switch-over';

const FIXTURE = join(import.meta.dirname, '../../../../legacy/scripts/test/fixtures/tracker');
const NOW = '2026-10-20T10:00:00.000Z';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-switch-'));
  folders.push(path);
  return path;
};

const artefact = (): string => {
  const dist = folder();
  for (const file of ['server.js', 'tracker.js', 'admin.js']) writeFileSync(join(dist, file), '');
  for (const dir of ['web', 'claude']) mkdirSync(join(dist, dir));
  writeFileSync(join(dist, 'VERSION'), '2.0.0');
  writeFileSync(join(dist, 'start-front.sh'), '');
  writeFileSync(join(dist, 'stop-front.sh'), '');
  writeFileSync(join(dist, 'package.json'), '{"type":"module"}');
  return dist;
};

/** A project with the V1 fixture installed in tools/tracker. */
const v1Project = (): string => {
  const root = folder();
  cpSync(FIXTURE, join(root, 'tools', 'tracker'), { recursive: true });
  writeFileSync(join(root, 'tools', 'tracker', 'tracker.mjs'), '// V1 launcher');
  return root;
};

/** Records what the V1 installer was asked to do. */
const recorder = (): { run: RunV1; calls: string[][] } => {
  const calls: string[][] = [];
  return {
    calls,
    run: (args) => {
      calls.push(args);
      return Promise.resolve();
    },
  };
};

// The V1 data lives in legacy/, which the public branch leaves out (ADR 0047).
describe.skipIf(!existsSync(FIXTURE))('switching a V1 project over to V2 (ADR 0031)', () => {
  it('removes the V1 hooks with the V1 itself, sets V1 aside untouched, installs V2 and migrates', async () => {
    const root = v1Project();
    const before = readFileSync(join(root, 'tools', 'tracker', 'tracker.config.json'), 'utf8');
    const v1 = recorder();
    await switchOverToV2({
      root,
      artefactDir: artefact(),
      projectId: 'demo',
      now: NOW,
      runV1: v1.run,
    });

    expect(v1.calls).toEqual([
      ['--uninstall', '--root', root, '--target', join(root, 'tools', 'tracker')],
    ]);
    expect(readFileSync(join(root, 'tools', 'tracker-v1', 'tracker.config.json'), 'utf8')).toBe(
      before,
    );
    const db = openDatabase(join(root, 'tools', 'tracker', 'tracker.db'));
    expect(db.prepare('SELECT count(*) AS n FROM ticket').get()).toEqual({ n: 4 });
    db.close();
  });

  it('keeps the port of the V1, so the page stays where the developer knows it', async () => {
    const root = v1Project();
    await switchOverToV2({
      root,
      artefactDir: artefact(),
      projectId: 'demo',
      now: NOW,
      runV1: recorder().run,
    });
    const config: unknown = JSON.parse(
      readFileSync(join(root, 'tools', 'tracker', 'tracker.config.json'), 'utf8'),
    );
    expect(config).toEqual({ port: 9610 });
  });

  it('refuses a project the V1 tracker does not follow, before changing anything', async () => {
    const root = v1Project();
    const v1 = recorder();
    await expect(
      switchOverToV2({
        root,
        artefactDir: artefact(),
        projectId: 'nowhere',
        now: NOW,
        runV1: v1.run,
      }),
    ).rejects.toThrow(/nowhere/);
    expect(v1.calls).toEqual([]);
  });

  it('asks which project to migrate when the V1 tracker follows several', async () => {
    const root = v1Project();
    await expect(
      switchOverToV2({ root, artefactDir: artefact(), now: NOW, runV1: recorder().run }),
    ).rejects.toThrow(/demo, shop/);
    expect(existsSync(join(root, 'tools', 'tracker-v1'))).toBe(false);
  });

  it('undoes everything when the migration fails: V1 back in place, its hooks put back', async () => {
    const root = v1Project();
    writeFileSync(join(root, 'tools', 'tracker', 'projects', 'demo', 'project.json'), '{ broken');
    const v1 = recorder();
    await expect(
      switchOverToV2({ root, artefactDir: artefact(), projectId: 'demo', now: NOW, runV1: v1.run }),
    ).rejects.toThrow();
    expect(existsSync(join(root, 'tools', 'tracker', 'tracker.mjs'))).toBe(true);
    expect(existsSync(join(root, 'tools', 'tracker-v1'))).toBe(false);
    expect(v1.calls.at(-1)).toEqual(['--root', root, '--target', join(root, 'tools', 'tracker')]);
    expect(existsSync(join(root, '.mcp.json'))).toBe(false);
  });

  it('rolls back on request, keeping the V2 data aside', async () => {
    const root = v1Project();
    await switchOverToV2({
      root,
      artefactDir: artefact(),
      projectId: 'demo',
      now: NOW,
      runV1: recorder().run,
    });
    const v1 = recorder();
    const report = await rollBackToV1({ root, now: NOW, runV1: v1.run });
    expect(existsSync(join(root, 'tools', 'tracker', 'tracker.mjs'))).toBe(true);
    expect(existsSync(join(root, 'tools', 'tracker-v2-2026-10-20T10-00-00Z', 'tracker.db'))).toBe(
      true,
    );
    expect(v1.calls).toEqual([['--root', root, '--target', join(root, 'tools', 'tracker')]]);
    expect(report.join('\n')).toContain('tracker-v2-2026-10-20T10-00-00Z');
  });
});
