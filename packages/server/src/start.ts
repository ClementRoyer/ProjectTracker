import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { openDatabase } from '@project-tracker/core/store';
import { createApp } from './app';
import { changelogFile } from './changelog';
import { projectDocuments } from './documents';
import { jiraReader } from '@project-tracker/core/jira';
import type { JiraReader } from '@project-tracker/core/domain';
import { parseConfig, type Config } from './config';

export interface RunningServer {
  url: string;
  close: () => Promise<void>;
}

/** Starts the server of one project: its configuration, its database and a fresh developer token. */
export async function startServer(
  configFile: string,
  { webRoot }: { webRoot?: string } = {},
): Promise<RunningServer> {
  if (!existsSync(configFile)) {
    throw new Error(
      `Configuration introuvable : ${configFile}. Crée un fichier tracker.config.json (au minimum « {} ») dans le dossier de l'outil.`,
    );
  }
  const config = parseConfig(JSON.parse(readFileSync(configFile, 'utf8')));
  if (!config.ok) throw new Error(`Configuration invalide (${configFile}) :\n${config.error}`);
  const folder = dirname(configFile);
  const database = resolve(folder, config.value.database);
  const db = openDatabase(database);
  const developerToken = writeDeveloperToken(resolve(folder, 'developer.token'));
  const launcherToken = config.value.launcherTokenEnv
    ? (process.env[config.value.launcherTokenEnv] ?? null)
    : null;
  const jira = jiraOf(config.value);
  const app = createApp({
    db,
    config: config.value,
    developerToken,
    launcherToken,
    ...(jira ? { jira } : {}),
    ...(webRoot ? { webRoot } : {}),
    dataDir: dirname(database),
    registryFile:
      process.env.TRACKER_REGISTRY ??
      join(homedir(), '.config', 'project-tracker', 'projects.json'),
    // The configuration sits in tools/tracker/: the project root is two folders up.
    documents: projectDocuments(resolve(folder, '..', '..'), config.value.documents),
    ...(config.value.changelog
      ? { changelog: changelogFile(resolve(folder, '..', '..', config.value.changelogFile)) }
      : {}),
  });
  const server = await new Promise<ReturnType<typeof serve>>((ready) => {
    const running = serve(
      { fetch: app.fetch, hostname: config.value.host, port: config.value.port },
      () => {
        ready(running);
      },
    );
  });
  return {
    url: `http://${config.value.host}:${String(config.value.port)}`,
    close: () =>
      new Promise((done) => {
        server.close(() => {
          db.close();
          done();
        });
      }),
  };
}

/** A new token at each start, readable by its owner only (ADR 0027). */
function writeDeveloperToken(file: string): string {
  const token = randomBytes(32).toString('base64url');
  rmSync(file, { force: true });
  writeFileSync(file, token, { mode: 0o600 });
  return token;
}

/** The Jira reader, when the file names Jira and the environment holds its email and token (never logged). */
function jiraOf(config: Config): JiraReader | undefined {
  if (!config.jira) return undefined;
  const email = process.env[config.jira.emailEnv];
  const token = process.env[config.jira.tokenEnv];
  if (!email || !token) {
    console.warn(
      `Jira : ${config.jira.emailEnv} et ${config.jira.tokenEnv} doivent être définies pour charger Jira.`,
    );
    return undefined;
  }
  return jiraReader({ baseUrl: config.jira.baseUrl, project: config.jira.project, email, token });
}
