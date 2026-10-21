import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Starts the built server on an empty project, with the fake Jira of e2e/ next to it, for the
// Playwright journeys; cleans up when stopped.
const port = Number(process.argv[2]);
const jiraPort = port + 1;
// A project folder, so that the changelog lands in its root (ADR 0037).
const root = mkdtempSync(join(tmpdir(), 'tracker-e2e-web-'));
const folder = join(root, 'tools', 'tracker');
mkdirSync(folder, { recursive: true });
writeFileSync(join(root, 'README.md'), '# Projet de démonstration\n\nLes règles du projet.');
writeFileSync(
  join(folder, 'tracker.config.json'),
  JSON.stringify({
    port,
    changelog: true,
    documents: ['README.md'],
    jira: {
      baseUrl: `http://127.0.0.1:${String(jiraPort)}`,
      project: 'DEMO',
      emailEnv: 'E2E_JIRA_EMAIL',
      tokenEnv: 'E2E_JIRA_TOKEN',
    },
  }),
);
const jira = spawn('node', ['e2e/fake-jira.mjs', String(jiraPort)], { stdio: 'inherit' });
const server = spawn('node', ['dist/server.js', join(folder, 'tracker.config.json')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_JIRA_EMAIL: 'dev@example.test',
    E2E_JIRA_TOKEN: 'fake-token',
    // Never the developer's own registry of projects (ADR 0039).
    TRACKER_REGISTRY: join(root, 'projects.json'),
  },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.kill();
    jira.kill();
    rmSync(root, { recursive: true, force: true });
    process.exit(0);
  });
}
