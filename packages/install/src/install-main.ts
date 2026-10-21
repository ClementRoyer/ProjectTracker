import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { installProject } from './project/install';
import { defaultRegistryFile } from './project/registry';
import { rollBackToV1, switchOverToV2, type RunV1 } from './project/switch-over';

// Usage: node dist/install.js --root <project> [--port <n>] [--from-v1 [--v1-project <id>]] [--rollback-v1]
const USAGE = `Usage : node dist/install.js --root <projet> [options]
  --port <n>            port du serveur, pour une nouvelle installation (par défaut 9620)
  --from-v1             bascule un projet V1 : V1 mise de côté dans tools/tracker-v1, V2 installée et migrée
  --v1-project <id>     le projet V1 à migrer, si le tracker V1 en suit plusieurs
  --rollback-v1         remet la V1 en place ; la V2 est gardée à côté
Relancée sur un projet déjà installé, la commande le met à jour, après une sauvegarde de la base.`;

const artefactDir = dirname(fileURLToPath(import.meta.url));
const legacyInstaller = resolve(artefactDir, '..', 'legacy', 'scripts', 'install.mjs');

const runV1: RunV1 = (args) =>
  new Promise((done, failed) => {
    if (!existsSync(legacyInstaller)) {
      failed(new Error(`Installeur V1 introuvable : ${legacyInstaller}`));
      return;
    }
    const child = spawn('node', [legacyInstaller, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) done();
      else failed(new Error(`L’installeur V1 a échoué (code ${String(code)}).`));
    });
  });

async function main(): Promise<string[]> {
  const { values } = parseArgs({
    options: {
      root: { type: 'string' },
      port: { type: 'string' },
      'from-v1': { type: 'boolean' },
      'v1-project': { type: 'string' },
      'rollback-v1': { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help === true || values.root === undefined) return [USAGE];
  const root = resolve(values.root);
  const now = new Date().toISOString();
  const port = values.port === undefined ? {} : { port: Number(values.port) };
  const registryFile = defaultRegistryFile(process.env);
  if (values['rollback-v1'] === true) return rollBackToV1({ root, now, runV1, registryFile });
  if (values['from-v1'] === true) {
    const projectId = values['v1-project'] === undefined ? {} : { projectId: values['v1-project'] };
    return switchOverToV2({ root, artefactDir, now, runV1, registryFile, ...port, ...projectId });
  }
  return installProject({ root, artefactDir, now, registryFile, ...port });
}

main().then(
  (report) => {
    process.stdout.write(`${report.join('\n')}\n`);
  },
  (error: unknown) => {
    process.stderr.write(`install : ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
