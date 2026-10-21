import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trackerClient } from './client';
import { readLauncherConfig } from './config';
import { startLauncher } from './loop';

// Usage, on the back-end server: node launcher.js [launcher.config.json]. Started by hand (ADR 0010).
const config = readLauncherConfig(resolve(process.argv[2] ?? 'launcher.config.json'));
const token = process.env[config.tokenEnv];
if (!token) {
  console.error(`Launcher token missing: set the ${config.tokenEnv} variable.`);
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
log(`launcher "${config.name}" started: ${config.tracker}, mirror ${config.mirror}`);
process.on('SIGINT', () => {
  log('stop requested: waiting for the running agents');
  void launcher.stop().then(() => process.exit(0));
});
