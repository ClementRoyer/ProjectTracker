import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { installProject } from './install';
import { installedKind, projectPaths } from './paths';

export interface SetV1AsideRequest {
  root: string;
  artefactDir: string;
  port?: number;
  now: string;
  registryFile?: string;
}

// What V1 wrote outside its folder, as its own uninstaller recognises it (legacy/scripts/session-files.mjs).
const V1_HOOK = /\/tracker\.mjs" /;
const V1_COMMAND = '<!-- project-tracker command -->';
const V1_IGNORE_BLOCK = /# project-tracker:start\r?\n[\s\S]*?# project-tracker:end(?:\r?\n)?/;
const V1_RULES_BLOCK =
  /<!-- project-tracker:start -->[\s\S]*?<!-- project-tracker:end -->(?:\r?\n)?/g;

const hook = z.object({ command: z.string().optional() }).loose();
const group = z.object({ hooks: z.array(hook).default([]) }).loose();
const settingsFile = z.object({ hooks: z.record(z.string(), z.array(group)).optional() }).loose();
const v1Config = z.object({ port: z.number().optional() }).loose();

/** V1 moved to tools/tracker-legacy with its data, its session files removed, V2 installed as new (ADR 0049). */
export async function setV1AsideAndInstall(request: SetV1AsideRequest): Promise<string[]> {
  const paths = projectPaths(request.root);
  if (installedKind(paths) !== 'v1') throw new Error(`No V1 in ${paths.trackerDir}.`);
  const legacyDir = join(paths.root, 'tools', 'tracker-legacy');
  if (existsSync(legacyDir)) throw new Error(`${legacyDir} already exists: nothing was changed.`);
  const port =
    request.port ?? v1Config.parse(JSON.parse(readFileSync(paths.configFile, 'utf8'))).port;

  const removed = [
    ...['settings.json', 'settings.local.json'].flatMap((name) =>
      withoutV1Hooks(join(paths.root, '.claude', name)),
    ),
    ...withoutV1Commands(join(paths.root, '.claude', 'commands')),
    ...withoutBlock(join(paths.root, '.gitignore'), V1_IGNORE_BLOCK),
    ...withoutBlock(join(paths.root, 'CLAUDE.md'), V1_RULES_BLOCK),
  ];
  renameSync(paths.trackerDir, legacyDir);
  const installed = await installProject({
    root: request.root,
    artefactDir: request.artefactDir,
    now: request.now,
    ...(port === undefined ? {} : { port }),
    ...(request.registryFile === undefined ? {} : { registryFile: request.registryFile }),
  });
  return [
    `V1 set aside, with its data, without migration: ${legacyDir}`,
    ...removed.map((file) => `V1 removed from ${file}`),
    ...installed,
  ];
}

function withoutV1Hooks(file: string): string[] {
  if (!existsSync(file)) return [];
  const settings = settingsFile.parse(JSON.parse(readFileSync(file, 'utf8')));
  const { hooks, ...rest } = settings;
  const kept = Object.entries(hooks ?? {})
    .map(
      ([event, groups]) =>
        [
          event,
          groups
            .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !V1_HOOK.test(h.command ?? '')) }))
            .filter((g) => g.hooks.length > 0),
        ] as const,
    )
    .filter(([, groups]) => groups.length > 0);
  const next = { ...rest, ...(kept.length > 0 ? { hooks: Object.fromEntries(kept) } : {}) };
  if (JSON.stringify(next) === JSON.stringify(settings)) return [];
  if (Object.keys(next).length === 0) rmSync(file);
  else writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  return [file];
}

function withoutV1Commands(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .map((name) => join(folder, name))
    .filter((file) => file.endsWith('.md') && readFileSync(file, 'utf8').includes(V1_COMMAND))
    .map((file) => {
      rmSync(file);
      return file;
    });
}

/** The file without the block; a file left empty goes away. */
function withoutBlock(file: string, block: RegExp): string[] {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8');
  const rest = text.replace(block, '');
  if (rest === text) return [];
  const tidy = rest.replace(/\n{2,}$/, '\n');
  if (tidy.trim() === '') rmSync(file);
  else writeFileSync(file, tidy);
  return [file];
}
