import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/start';

const folders: string[] = [];
const servers: RunningServer[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await server.close();
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

const trackerFolder = (config: object): string => {
  const folder = mkdtempSync(join(tmpdir(), 'tracker-server-'));
  folders.push(folder);
  writeFileSync(join(folder, 'tracker.config.json'), JSON.stringify(config));
  return folder;
};

describe('starting the server', () => {
  it('writes a developer token only its owner can read, and answers with it', async () => {
    const folder = trackerFolder({ port: 9631 });
    const server = await startServer(join(folder, 'tracker.config.json'));
    servers.push(server);
    const token = readFileSync(join(folder, 'developer.token'), 'utf8');
    expect(statSync(join(folder, 'developer.token')).mode & 0o777).toBe(0o600);
    const response = await fetch(`${server.url}/api/listTickets`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(await response.json()).toEqual({ tickets: [] });
  });

  it('gives a new developer token at each start', async () => {
    const folder = trackerFolder({ port: 9632 });
    const first = await startServer(join(folder, 'tracker.config.json'));
    const before = readFileSync(join(folder, 'developer.token'), 'utf8');
    await first.close();
    servers.push(await startServer(join(folder, 'tracker.config.json')));
    expect(readFileSync(join(folder, 'developer.token'), 'utf8')).not.toBe(before);
  });

  it('writes the delivery changelog at the root of the project, two folders above the configuration (ADR 0037)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'tracker-project-'));
    folders.push(root);
    const folder = join(root, 'tools', 'tracker');
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, 'tracker.config.json'),
      JSON.stringify({ port: 9633, changelog: true }),
    );
    const server = await startServer(join(folder, 'tracker.config.json'));
    servers.push(server);
    const token = readFileSync(join(folder, 'developer.token'), 'utf8');
    const call = (operation: string, input: object): Promise<Response> =>
      fetch(`${server.url}/api/${operation}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
    await call('createTicket', { title: 'Search by name' });
    await call('acceptChangelog', { key: 'LOC-1', line: 'Search customers by name' });
    await call('deliverBatch', { name: 'Livraison 1', keys: ['LOC-1'] });
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toContain(
      '- LOC-1 : Search customers by name',
    );
  });

  it('says how to fix a missing configuration file', async () => {
    await expect(startServer('/nowhere/tracker.config.json')).rejects.toThrow(
      /tracker\.config\.json/,
    );
  });

  it('refuses a configuration that is not valid, naming the key', async () => {
    const folder = trackerFolder({ host: '0.0.0.0' });
    await expect(startServer(join(folder, 'tracker.config.json'))).rejects.toThrow(/host/);
  });
});
