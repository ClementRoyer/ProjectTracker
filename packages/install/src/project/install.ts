import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { backupProjectData, stamp } from './backup';
import { withTrackerHooks, withTrackerMcp } from './claude-settings';
import { ensureConfig } from './config';
import { installedKind, installedVersion, projectPaths, type ProjectPaths } from './paths';
import { registerProject } from './registry';

/** What a project runs; the launcher and the file hold go to the back-end server instead (ADR 0010). */
const APP_ENTRIES = [
  'server.js',
  'tracker.js',
  'admin.js',
  'web',
  'claude',
  'start-front.sh',
  'stop-front.sh',
  // Declares the bundles as ES modules: no warning from Node at start (ADR 0052).
  'package.json',
  'VERSION',
] as const;

const GITIGNORE = [
  'app/',
  '*.db',
  '*.db-*',
  'backups/',
  'attachments/',
  'developer.token',
  'secrets.env',
  'server.log',
  'server.pid',
  '',
].join('\n');

export interface InstallRequest {
  root: string;
  /** The built dist/ of this repository. */
  artefactDir: string;
  port?: number;
  now: string;
  /** The machine's registry of projects (ADR 0039); none in tests. */
  registryFile?: string;
}

/** Installs the tool in a project, or updates it: the database is saved first (ADR 0030). */
export async function installProject(request: InstallRequest): Promise<string[]> {
  const paths = projectPaths(request.root);
  const kind = installedKind(paths);
  if (kind === 'v1' || kind === 'other') {
    throw new Error(
      `${paths.trackerDir} holds ${kind === 'v1' ? 'a V1: use the switch-over (--from-v1)' : 'something other than a V2'}; nothing was changed.`,
    );
  }
  const previous = installedVersion(paths);
  const version = readFileSync(join(request.artefactDir, 'VERSION'), 'utf8').trim();
  mkdirSync(paths.trackerDir, { recursive: true });
  const config = ensureConfig(paths, request.port);
  const report: string[] = [];
  if (existsSync(config.database)) {
    const label = `${stamp(request.now)}-before-${version}`;
    report.push(
      `Database backed up: ${await backupProjectData(config.database, paths.backupsDir, label)}`,
    );
  }
  copyApp(request.artefactDir, paths);
  writeFileSync(join(paths.trackerDir, '.gitignore'), GITIGNORE);
  const url = `http://127.0.0.1:${String(config.port)}`;
  plugClaudeCode(paths, url);
  if (request.registryFile !== undefined) registerProject(request.registryFile, paths.root, url);
  return [
    previous === null
      ? `project-tracker ${version} installed in ${paths.trackerDir}`
      : `project-tracker updated: ${previous} → ${version}`,
    ...report,
    ...portLine(config, request.port),
    ...howToUse(url, previous !== null),
  ];
}

function copyApp(artefactDir: string, paths: ProjectPaths): void {
  rmSync(paths.appDir, { recursive: true, force: true });
  mkdirSync(paths.appDir, { recursive: true });
  for (const entry of APP_ENTRIES) {
    cpSync(join(artefactDir, entry), join(paths.appDir, entry), { recursive: true });
  }
}

function plugClaudeCode(paths: ProjectPaths, url: string): void {
  updateJson(join(paths.root, '.claude', 'settings.json'), (raw) => withTrackerHooks(raw, url));
  updateJson(join(paths.root, '.mcp.json'), (raw) => withTrackerMcp(raw, url));
}

/** Rewrites a JSON file of the project, keeping what it held. */
export function updateJson(file: string, change: (raw: unknown) => unknown): void {
  const raw: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(change(raw), null, 2)}\n`);
}

function portLine(config: { port: number; created: boolean }, asked: number | undefined): string[] {
  if (config.created || asked === undefined || asked === config.port) return [];
  return [`Port kept: ${String(config.port)} (the existing configuration is not changed)`];
}

function howToUse(url: string, updated: boolean): string[] {
  return [
    `${updated ? 'Restart' : 'Start'} the server: tools/tracker/app/start-front.sh`,
    `Page: ${url}`,
    'Claude Code: hooks and MCP added to .claude/settings.json and .mcp.json',
    `Other agents: MCP over HTTP at ${url}/mcp; CLI: node tools/tracker/app/tracker.js`,
  ];
}
