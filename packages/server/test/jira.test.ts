import { createServer, type IncomingMessage, type Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/start';

const requests: { method: string; url: string; authorization: string }[] = [];
let fakeJira: Server | undefined;
let tracker: RunningServer | undefined;
let folder = '';

beforeAll(async () => {
  fakeJira = createServer((request: IncomingMessage, response) => {
    requests.push({
      method: request.method ?? '',
      url: request.url ?? '',
      authorization: request.headers.authorization ?? '',
    });
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        isLast: true,
        issues: [
          {
            key: 'DEMO-7',
            fields: {
              summary: 'Paginate the customer list',
              status: { name: 'To Do' },
              updated: '2026-10-19T08:00:00.000Z',
              description: 'Fifty per page.',
            },
          },
        ],
      }),
    );
  });
  await new Promise<void>((ready) => fakeJira?.listen(9661, '127.0.0.1', ready));
  folder = mkdtempSync(join(tmpdir(), 'tracker-jira-'));
  writeFileSync(
    join(folder, 'tracker.config.json'),
    JSON.stringify({
      port: 9662,
      jira: {
        baseUrl: 'http://127.0.0.1:9661',
        project: 'DEMO',
        emailEnv: 'TEST_JIRA_EMAIL',
        tokenEnv: 'TEST_JIRA_TOKEN',
      },
    }),
  );
  process.env.TEST_JIRA_EMAIL = 'dev@example.test';
  process.env.TEST_JIRA_TOKEN = 'secret-token';
  tracker = await startServer(join(folder, 'tracker.config.json'));
});

afterAll(async () => {
  await tracker?.close();
  await new Promise((done) => fakeJira?.close(done));
  rmSync(folder, { recursive: true, force: true });
});

describe('loading from a Jira configured by file and environment (F2)', () => {
  it('reads the assigned issues with GET only, and creates the tickets', async () => {
    const response = await fetch(`${tracker?.url ?? ''}/api/loadFromJira`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${readFileSync(join(folder, 'developer.token'), 'utf8')}`,
        'content-type': 'application/json',
      },
      body: '{}',
    });
    const body = JSON.stringify(await response.json());
    expect(JSON.parse(body)).toMatchObject({ read: 1, created: ['DEMO-7'] });
    expect(requests.map((request) => request.method)).toEqual(['GET']);
    expect(body).not.toMatch(/secret-token/);
  });
});
