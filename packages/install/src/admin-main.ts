import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { backupProject, restoreProject } from './project/admin';
import { projectPaths } from './project/paths';

// Usage, from the project root: node tools/tracker/app/admin.js backup | restore <file>
const USAGE = `Usage : node tools/tracker/app/admin.js backup           copie la base et les pièces jointes dans tools/tracker/backups/ (serveur lancé ou non)
        node tools/tracker/app/admin.js restore <dossier>  remet une sauvegarde en place (serveur arrêté)`;

// admin.js sits in tools/tracker/app/: the project root is three levels up.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const paths = projectPaths(root);

async function isServerUp(): Promise<boolean> {
  const config = existsSync(paths.configFile)
    ? z
        .object({ port: z.number().default(9620) })
        .loose()
        .parse(JSON.parse(readFileSync(paths.configFile, 'utf8')))
    : { port: 9620 };
  const { port } = config;
  try {
    await fetch(`http://127.0.0.1:${String(port)}/`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

async function main(args: string[]): Promise<string[]> {
  const now = new Date().toISOString();
  const [command, file] = args;
  if (command === 'backup') return [`Base sauvegardée : ${await backupProject(paths, now)}`];
  if (command === 'restore' && file !== undefined) {
    return restoreProject(paths, resolve(file), now, isServerUp);
  }
  return [USAGE];
}

main(process.argv.slice(2)).then(
  (report) => {
    process.stdout.write(`${report.join('\n')}\n`);
  },
  (error: unknown) => {
    process.stderr.write(`admin : ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
