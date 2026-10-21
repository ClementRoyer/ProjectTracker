import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(import.meta.dirname, '..', '..', '..', 'scripts', 'publish-stable.sh');

const folders: string[] = [];
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A development repository on v2, with the folders the public branch leaves out. */
function repository(): string {
  const repo = mkdtempSync(join(tmpdir(), 'tracker-publish-'));
  folders.push(repo);
  git(repo, 'init', '-q', '-b', 'v2');
  git(repo, 'config', 'user.name', 'Developer');
  git(repo, 'config', 'user.email', 'developer@example.test');
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ version: '2.0.0' }),
    'README.md': '# project-tracker\n',
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n\n## [2.0.0] - 2026-10-21\n\n- First.\n',
    'docs/adr/0001-decision.md': 'kept\n',
    'docs/plan/v2-plan.md': 'private\n',
    'docs/analysis/audit.md': 'private\n',
    'docs/mockups/screen.html': 'private\n',
    'legacy/old.mjs': 'private\n',
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  }
  mkdirSync(join(repo, 'scripts'));
  copyFileSync(SCRIPT, join(repo, 'scripts', 'publish-stable.sh'));
  git(repo, 'add', '.');
  git(repo, 'commit', '-qm', 'work in progress');
  return repo;
}

function publish(repo: string): { code: number; out: string } {
  const done = spawnSync('bash', [join(repo, 'scripts', 'publish-stable.sh')], {
    cwd: repo,
    env: { ...process.env, PUBLISH_SKIP_CHECKS: '1' },
    encoding: 'utf8',
  });
  return { code: done.status ?? 1, out: `${done.stdout}${done.stderr}` };
}

describe('publishing a stable version (ADR 0047)', () => {
  it('makes one release commit without the private folders, tags it, and only shows the push', () => {
    const repo = repository();
    const { code, out } = publish(repo);
    expect(code, out).toBe(0);
    expect(git(repo, 'log', '--format=%s|%P', 'public')).toBe('🔖 Release v2.0.0|');
    expect(git(repo, 'rev-parse', 'v2.0.0')).toBe(git(repo, 'rev-parse', 'public'));
    expect(git(repo, 'ls-tree', '-r', '--name-only', 'public').split('\n')).toEqual([
      'CHANGELOG.md',
      'README.md',
      'docs/adr/0001-decision.md',
      'package.json',
      'scripts/publish-stable.sh',
    ]);
    expect(out).toContain('git push origin public:master v2.0.0');
    expect(git(repo, 'branch', '--show-current')).toBe('v2');
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  it('adds one commit per new version on top of the previous one', () => {
    const repo = repository();
    publish(repo);
    const first = git(repo, 'rev-parse', 'public');
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ version: '2.1.0' }));
    writeFileSync(
      join(repo, 'CHANGELOG.md'),
      '# Changelog\n\n## [2.1.0] - 2026-10-22\n\n- Next.\n',
    );
    git(repo, 'commit', '-qam', 'next version');
    const { code, out } = publish(repo);
    expect(code, out).toBe(0);
    expect(git(repo, 'log', '--format=%s', 'public').split('\n')).toEqual([
      '🔖 Release v2.1.0',
      '🔖 Release v2.0.0',
    ]);
    expect(git(repo, 'rev-parse', 'public^')).toBe(first);
  });

  it('signs the release with the publication address when the repository sets one', () => {
    const repo = repository();
    git(repo, 'config', 'tracker.publishEmail', 'developer@users.noreply.example.test');
    expect(publish(repo).code).toBe(0);
    expect(git(repo, 'log', '-1', '--format=%an <%ae> | %cn <%ce>', 'public')).toBe(
      'Developer <developer@users.noreply.example.test> | Developer <developer@users.noreply.example.test>',
    );
  });

  it('refuses a version that has no section in the changelog (ADR 0051)', () => {
    const repo = repository();
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ version: '2.0.1' }));
    git(repo, 'commit', '-qam', 'bump without changelog');
    const { code, out } = publish(repo);
    expect(code).not.toBe(0);
    expect(out).toMatch(/CHANGELOG\.md/);
    expect(() => git(repo, 'rev-parse', '--verify', 'public')).toThrow();
  });

  it('refuses a version already published, or uncommitted changes', () => {
    const repo = repository();
    publish(repo);
    const again = publish(repo);
    expect(again.code).not.toBe(0);
    expect(again.out).toMatch(/v2\.0\.0 existe déjà/);

    writeFileSync(join(repo, 'README.md'), 'changed\n');
    const dirty = publish(repo);
    expect(dirty.code).not.toBe(0);
    expect(dirty.out).toMatch(/non commités/);
  });
});
