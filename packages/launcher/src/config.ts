import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

/** The launcher's file, on the back-end server (ADR 0010). Its token comes from the environment only. */
const launcherConfig = z
  .object({
    tracker: z.url(),
    name: z.string().min(1).default('back-end'),
    tokenEnv: z.string().min(1).default('TRACKER_LAUNCHER_TOKEN'),
    /** An HTTP proxy towards the private network, for Tailscale without TUN (ADR 0021). */
    proxy: z.url().optional(),
    mirror: z.string().min(1),
    workFolder: z.string().default('.tracker-launcher'),
    maxParallel: z.number().int().min(1).max(10).default(3),
    maxSeconds: z.number().int().min(1).default(1800),
    command: z.array(z.string()).min(1),
  })
  .strict();

export type LauncherConfig = z.infer<typeof launcherConfig>;

/** Reads the file; relative folders are taken from the file's folder. */
export function readLauncherConfig(file: string): LauncherConfig {
  if (!existsSync(file)) throw new Error(`Configuration du lanceur introuvable : ${file}`);
  const parsed = launcherConfig.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => `${issue.path.join('.')} : ${issue.message}`).join('\n'),
    );
  }
  const folder = dirname(file);
  return {
    ...parsed.data,
    mirror: resolve(folder, parsed.data.mirror),
    workFolder: resolve(folder, parsed.data.workFolder),
  };
}
