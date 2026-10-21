import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trackerClient } from './client';
import { readLauncherConfig } from './config';
import { startLauncher } from './loop';

// Usage, on the back-end server: node launcher.js [launcher.config.json]. Started by hand (ADR 0010).
const config = readLauncherConfig(resolve(process.argv[2] ?? 'launcher.config.json'));
const token = process.env[config.tokenEnv];
if (!token) {
  console.error(`Jeton du lanceur absent : définis la variable ${config.tokenEnv}.`);
  process.exit(1);
}
const log = (line: string): void => {
  console.log(`${new Date().toISOString()} ${line}`);
};
const launcher = startLauncher(config, {
  call: trackerClient({ url: config.tracker, token, proxy: config.proxy }),
  holdScript: join(dirname(fileURLToPath(import.meta.url)), 'hold.js'),
  log,
});
log(`lanceur « ${config.name} » démarré : ${config.tracker}, miroir ${config.mirror}`);
process.on('SIGINT', () => {
  log('arrêt demandé : attente des agents en cours');
  void launcher.stop().then(() => process.exit(0));
});
