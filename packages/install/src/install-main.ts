import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { installProject } from './project/install';
import { defaultRegistryFile } from './project/registry';
import { setV1AsideAndInstall } from './project/set-v1-aside';
import { rollBackToV1, switchOverToV2, type RunV1 } from './project/switch-over';

// Usage: node dist/install.js --root <project> [--port <n>] [--from-v1 [--v1-project <id>]] [--rollback-v1]
//        [--set-v1-aside]
const USAGE = `Usage: node dist/install.js --root <project> [options]
  --port <n>            server port, for a new installation (default 9620)
  --from-v1             switch over a V1 project: V1 set aside in tools/tracker-v1, V2 installed and migrated
  --v1-project <id>     the V1 project to migrate, if the V1 tracker follows several
  --rollback-v1         put V1 back in place; V2 is kept beside it
  --set-v1-aside        set V1 aside in tools/tracker-legacy, without migrating its data, and install V2
Run again on an installed project, the command updates it, after a backup of the database.`;

const artefactDir = dirname(fileURLToPath(import.meta.url));
const legacyInstaller = resolve(artefactDir, '..', 'legacy', 'scripts', 'install.mjs');

const runV1: RunV1 = (args) =>
  new Promise((done, failed) => {
    if (!existsSync(legacyInstaller)) {
      failed(new Error(`V1 installer not found: ${legacyInstaller}`));
      return;
    }
    const child = spawn('node', [legacyInstaller, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) done();
      else failed(new Error(`The V1 installer failed (code ${String(code)}).`));
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
      'set-v1-aside': { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help === true || values.root === undefined) return [USAGE];
  const root = resolve(values.root);
  const now = new Date().toISOString();
  const port = values.port === undefined ? {} : { port: Number(values.port) };
  const registryFile = defaultRegistryFile(process.env);
  if (values['rollback-v1'] === true) return rollBackToV1({ root, now, runV1, registryFile });
  if (values['set-v1-aside'] === true) {
    return setV1AsideAndInstall({ root, artefactDir, now, registryFile, ...port });
  }
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
    process.stderr.write(`install: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
