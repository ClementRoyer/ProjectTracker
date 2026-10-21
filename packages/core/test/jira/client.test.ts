import { describe, expect, it } from 'vitest';
import { jiraReader } from '../../src/jira';

interface Seen {
  url: URL;
  method: string;
  authorization: string | null;
}

const adf = (text: string): unknown => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const issue = (key: string, summary: string): unknown => ({
  key,
  fields: {
    summary,
    status: { name: 'In Progress' },
    updated: '2026-10-19T08:00:00.000+0200',
    description: adf(`Description of ${key}`),
    comment: {
      comments: [
        {
          id: '10',
          author: { displayName: 'Product owner' },
          body: adf('Please keep it simple.'),
          created: '2026-10-18T10:00:00.000+0200',
        },
      ],
    },
  },
});

/** A fake Jira that answers two pages, and records every request it gets. */
const fakeJira =
  (seen: Seen[]): typeof fetch =>
  (input, init) => {
    const url = input instanceof Request ? new URL(input.url) : new URL(input);
    seen.push({
      url,
      method: init?.method ?? 'GET',
      authorization: new Headers(init?.headers).get('authorization'),
    });
    const page = url.searchParams.get('nextPageToken')
      ? { issues: [issue('DEMO-2', 'Export orders')], isLast: true }
      : {
          issues: [issue('DEMO-1', 'Search by customer name')],
          nextPageToken: 'p2',
          isLast: false,
        };
    return Promise.resolve(new Response(JSON.stringify(page), { status: 200 }));
  };

const connection = {
  baseUrl: 'https://jira.example.test',
  project: 'DEMO',
  email: 'dev@example.test',
  token: 'secret-token',
};

describe('Jira client (read-only, ADR 0026)', () => {
  it('reads every page of the issues assigned to the developer in the project', async () => {
    const seen: Seen[] = [];
    const issues = await jiraReader(connection, fakeJira(seen))();
    expect(issues.map((found) => found.key)).toEqual(['DEMO-1', 'DEMO-2']);
    expect(seen[0]?.url.pathname).toBe('/rest/api/3/search/jql');
    expect(seen[0]?.url.searchParams.get('jql')).toBe(
      'project = "DEMO" AND assignee = currentUser() ORDER BY updated DESC',
    );
  });

  it('reads only the children of the parent tickets, when the project names some (ADR 0052)', async () => {
    const seen: Seen[] = [];
    await jiraReader({ ...connection, parents: ['DEMO-10', 'DEMO-20'] }, fakeJira(seen))();
    expect(seen[0]?.url.searchParams.get('jql')).toBe(
      'project = "DEMO" AND assignee = currentUser() AND parent in (DEMO-10, DEMO-20) ORDER BY updated DESC',
    );
  });

  it('only ever sends GET requests', async () => {
    const seen: Seen[] = [];
    await jiraReader(connection, fakeJira(seen))();
    expect(new Set(seen.map((request) => request.method))).toEqual(new Set(['GET']));
  });

  it('authenticates with the email and the token from the environment', async () => {
    const seen: Seen[] = [];
    await jiraReader(connection, fakeJira(seen))();
    expect(seen[0]?.authorization).toBe(
      `Basic ${Buffer.from('dev@example.test:secret-token').toString('base64')}`,
    );
  });

  it('turns the rich text of Jira into plain text, and keeps the comments', async () => {
    const [first] = await jiraReader(connection, fakeJira([]))();
    expect(first).toMatchObject({
      title: 'Search by customer name',
      status: 'In Progress',
      url: 'https://jira.example.test/browse/DEMO-1',
      description: 'Description of DEMO-1',
      comments: [{ id: '10', author: 'Product owner', body: 'Please keep it simple.' }],
    });
  });

  it('fails without ever showing the token', async () => {
    const failing: typeof fetch = () => Promise.resolve(new Response('nope', { status: 401 }));
    const error = await jiraReader(connection, failing)().catch((caught: unknown) => caught);
    expect(String(error)).toMatch(/401/);
    expect(String(error)).not.toMatch(/secret-token/);
  });
});
