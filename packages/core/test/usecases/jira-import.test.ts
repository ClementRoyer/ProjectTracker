import { describe, expect, it } from 'vitest';
import type { JiraIssue } from '../../src/domain';
import { getTicket, listNovelties, loadFromJira, setPriority } from '../../src/usecases';
import { testContext } from './context';

const issue = (key: string, changes: Partial<JiraIssue> = {}): JiraIssue => ({
  key,
  title: `Title of ${key}`,
  status: 'To Do',
  url: `https://jira.example.test/browse/${key}`,
  description: `Description of ${key}`,
  comments: [],
  updatedAt: '2026-10-19T06:00:00.000Z',
  ...changes,
});

const withJira = (issues: JiraIssue[]): ReturnType<typeof testContext> => {
  const ctx = testContext();
  ctx.jira = () => Promise.resolve(issues);
  return ctx;
};

describe('loading from Jira (F2)', () => {
  it('creates the new tickets, with their request and their Jira status', async () => {
    const ctx = withJira([issue('DEMO-1'), issue('DEMO-2')]);
    const loaded = await loadFromJira(ctx, {});
    expect(loaded.ok && loaded.value).toMatchObject({
      read: 2,
      created: ['DEMO-1', 'DEMO-2'],
      changed: [],
    });
    const ticket = getTicket(ctx, { key: 'DEMO-1' });
    expect(ticket.ok && ticket.value).toMatchObject({
      origin: 'jira',
      jiraStatus: 'To Do',
      initialRequest: 'Description of DEMO-1',
      jiraUrl: 'https://jira.example.test/browse/DEMO-1',
    });
  });

  it('journals what changed in Jira, word for word, and nothing when nothing changed', async () => {
    const ctx = withJira([issue('DEMO-1')]);
    await loadFromJira(ctx, {});
    ctx.jira = () =>
      Promise.resolve([
        issue('DEMO-1', {
          status: 'In Progress',
          comments: [
            {
              id: '7',
              author: 'Product owner',
              body: 'Keep it simple.',
              createdAt: '2026-10-19T07:00:00.000Z',
            },
          ],
        }),
      ]);
    const second = await loadFromJira(ctx, {});
    expect(second.ok && second.value.changed).toEqual(['DEMO-1']);
    const ticket = getTicket(ctx, { key: 'DEMO-1' });
    expect(ticket.ok && ticket.value.entries.slice(-2).map((e) => e.body)).toEqual([
      'Statut Jira : To Do → In Progress',
      'Product owner : Keep it simple.',
    ]);
    const third = await loadFromJira(ctx, {});
    expect(third.ok && third.value.changed).toEqual([]);
  });

  it('names the tickets no longer assigned to the developer, and keeps them', async () => {
    const ctx = withJira([issue('DEMO-1'), issue('DEMO-2')]);
    await loadFromJira(ctx, {});
    ctx.jira = () => Promise.resolve([issue('DEMO-1')]);
    const loaded = await loadFromJira(ctx, {});
    expect(loaded.ok && loaded.value.notAssigned).toEqual(['DEMO-2']);
    expect(getTicket(ctx, { key: 'DEMO-2' }).ok).toBe(true);
  });

  it('shows what Jira brought in the novelties', async () => {
    const ctx = withJira([issue('DEMO-1')]);
    await loadFromJira(ctx, {});
    const novelties = listNovelties(ctx, {});
    expect(novelties.ok && novelties.value.entries.map((e) => [e.key, e.authorKind])).toEqual([
      ['DEMO-1', 'jira'],
    ]);
  });

  it('says when Jira is not configured', async () => {
    expect(await loadFromJira(testContext(), {})).toEqual({
      ok: false,
      error: 'jiraNotConfigured',
    });
  });

  it('says when Jira cannot be read', async () => {
    const ctx = testContext();
    ctx.jira = () => Promise.reject(new Error('Jira answered 401'));
    expect(await loadFromJira(ctx, {})).toEqual({ ok: false, error: 'jiraUnreachable' });
  });

  it('takes the Jira priority when the ticket is created, and never overwrites the developer’s afterwards (ADR 0032)', async () => {
    const ctx = withJira([issue('DEMO-1', { priority: 'Highest' })]);
    await loadFromJira(ctx, {});
    const created = getTicket(ctx, { key: 'DEMO-1' });
    expect(created.ok && created.value.priority).toBe('urgent');

    setPriority(ctx, { key: 'DEMO-1', priority: 'low' });
    ctx.jira = () => Promise.resolve([issue('DEMO-1', { priority: 'High' })]);
    await loadFromJira(ctx, {});
    const reloaded = getTicket(ctx, { key: 'DEMO-1' });
    expect(reloaded.ok && reloaded.value.priority).toBe('low');
  });
});
