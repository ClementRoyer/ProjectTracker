import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './start';

// Usage: node packages/server/src/main.ts [tools/tracker/tracker.config.json]
const configFile = resolve(process.argv[2] ?? 'tools/tracker/tracker.config.json');

// Built into dist/server.js, next to the page built into dist/web.
const webRoot = join(dirname(fileURLToPath(import.meta.url)), 'web');

startServer(configFile, { webRoot }).then(
  (server) => {
    console.log(`project-tracker prêt sur ${server.url}`);
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
