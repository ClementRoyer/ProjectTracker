import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import type { ProjectPaths } from './paths';

const DEFAULT_PORT = 9620;

/** The two keys the install needs; the server validates the whole file (ADR 0026). */
const installView = z
  .object({ port: z.number().default(DEFAULT_PORT), database: z.string().default('tracker.db') })
  .loose();

export interface ProjectConfig {
  port: number;
  database: string;
  created: boolean;
}

/** The project's configuration, written with the chosen port when it does not exist yet. */
export function ensureConfig(paths: ProjectPaths, port: number | undefined): ProjectConfig {
  if (!existsSync(paths.configFile)) {
    const chosen = port ?? DEFAULT_PORT;
    writeFileSync(paths.configFile, `${JSON.stringify({ port: chosen }, null, 2)}\n`);
    return { port: chosen, database: join(paths.trackerDir, 'tracker.db'), created: true };
  }
  const config = installView.parse(JSON.parse(readFileSync(paths.configFile, 'utf8')));
  return {
    port: config.port,
    database: resolve(paths.trackerDir, config.database),
    created: false,
  };
}
