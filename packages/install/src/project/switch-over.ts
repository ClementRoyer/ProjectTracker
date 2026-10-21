import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { migrateV1Project } from '../v1/migrate';
import { stamp } from './backup';
import { withoutTracker } from './claude-settings';
import { ensureConfig } from './config';
import { installProject, updateJson } from './install';
import { installedKind, projectPaths, type ProjectPaths } from './paths';
import { unregisterProject } from './registry';

/** Runs the V1 installer (legacy/scripts/install.mjs) with these arguments; the V1 code is never changed. */
export type RunV1 = (args: string[]) => Promise<void>;

export interface SwitchOverRequest {
  root: string;
  artefactDir: string;
  projectId?: string;
  port?: number;
  now: string;
  runV1: RunV1;
  registryFile?: string;
}

const v1Config = z
  .object({ port: z.number().optional(), projects: z.array(z.object({ id: z.string() }).loose()) })
  .loose();

/** V1 set aside in tools/tracker-v1, V2 installed and migrated; everything undone on failure (ADR 0031). */
export async function switchOverToV2(request: SwitchOverRequest): Promise<string[]> {
  const paths = projectPaths(request.root);
  if (installedKind(paths) !== 'v1') throw new Error(`No V1 in ${paths.trackerDir}.`);
  if (existsSync(paths.v1Dir)) {
    throw new Error(`${paths.v1Dir} already exists: nothing was changed.`);
  }
  const v1 = v1Config.parse(JSON.parse(readFileSync(paths.configFile, 'utf8')));
  const projectId = chooseProject(
    v1.projects.map((project) => project.id),
    request.projectId,
  );
  await request.runV1(['--uninstall', '--root', paths.root, '--target', paths.trackerDir]);
  renameSync(paths.trackerDir, paths.v1Dir);
  try {
    const port = request.port ?? v1.port;
    const installed = await installProject({
      root: request.root,
      artefactDir: request.artefactDir,
      now: request.now,
      ...(port === undefined ? {} : { port }),
      ...(request.registryFile === undefined ? {} : { registryFile: request.registryFile }),
    });
    const { database } = ensureConfig(paths, undefined);
    const migrated = migrateV1Project({ trackerFolder: paths.v1Dir, projectId, database });
    return [
      `V1 set aside, unchanged: ${paths.v1Dir}`,
      `V1 project "${projectId}" migrated: ${String(migrated.tickets)} tickets, ${String(migrated.entries)} entries, ${String(migrated.attachments)} attachments, ${String(migrated.deliveryBatches)} deliveries, ${String(migrated.usage)} usage lines; left out: ${String(migrated.skipped.task)} tasks`,
      ...installed,
    ];
  } catch (error) {
    rmSync(paths.trackerDir, { recursive: true, force: true });
    await putV1Back(paths, request.runV1);
    throw error;
  }
}

/** Back to V1 on request: the V2 folder is kept aside, with its data. */
export async function rollBackToV1(request: {
  root: string;
  now: string;
  runV1: RunV1;
  registryFile?: string;
}): Promise<string[]> {
  const paths = projectPaths(request.root);
  if (!existsSync(paths.v1Dir)) throw new Error(`No V1 set aside in ${paths.v1Dir}.`);
  const keptV2 = join(paths.root, 'tools', `tracker-v2-${stamp(request.now)}`);
  renameSync(paths.trackerDir, keptV2);
  await putV1Back(paths, request.runV1);
  if (request.registryFile !== undefined) unregisterProject(request.registryFile, paths.root);
  return [`V1 put back in ${paths.trackerDir}, with its hooks`, `V2 kept beside it: ${keptV2}`];
}

function chooseProject(ids: string[], wanted: string | undefined): string {
  if (wanted !== undefined) {
    if (!ids.includes(wanted)) {
      throw new Error(
        `The V1 tracker does not follow project "${wanted}"; it follows: ${ids.join(', ')}.`,
      );
    }
    return wanted;
  }
  const [only] = ids;
  if (ids.length !== 1 || only === undefined) {
    throw new Error(
      `The V1 tracker follows several projects (${ids.join(', ')}): pick one with --v1-project.`,
    );
  }
  return only;
}

async function putV1Back(paths: ProjectPaths, runV1: RunV1): Promise<void> {
  removeV2Settings(paths.root);
  renameSync(paths.v1Dir, paths.trackerDir);
  await runV1(['--root', paths.root, '--target', paths.trackerDir]);
}

/** The V2 hooks and MCP server out of the project's settings; a file left empty goes away. */
function removeV2Settings(root: string): void {
  const settings = join(root, '.claude', 'settings.json');
  if (existsSync(settings)) updateJson(settings, (raw) => withoutTracker(raw));
  const mcp = join(root, '.mcp.json');
  if (existsSync(mcp)) {
    updateJson(mcp, (raw) => {
      const parsed = z
        .object({ mcpServers: z.record(z.string(), z.unknown()).default({}) })
        .loose()
        .parse(raw);
      const others = Object.entries(parsed.mcpServers).filter(([name]) => name !== 'tracker');
      return { ...parsed, mcpServers: Object.fromEntries(others) };
    });
  }
  for (const file of [settings, mcp]) removeIfEmpty(file);
}

function removeIfEmpty(file: string): void {
  if (!existsSync(file)) return;
  const raw = readFileSync(file, 'utf8').replace(/\s/g, '');
  if (raw === '{}' || raw === '{"mcpServers":{}}') rmSync(file);
}
