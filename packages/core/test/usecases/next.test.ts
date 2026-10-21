import { describe, expect, it } from 'vitest';
import type { JiraIssue } from '../../src/domain';
import {
  createTicket,
  getTicket,
  loadFromJira,
  setDueDate,
  setPriority,
  setSize,
  suggestNext,
} from '../../src/usecases';
import { agent, testContext } from './context';

const issue = (dueDate?: string): JiraIssue => ({
  key: 'DEMO-1',
  title: 'Show the date',
  status: 'To Do',
  url: 'https://jira.example.test/browse/DEMO-1',
  description: '',
  comments: [],
  updatedAt: '2026-10-19T06:00:00.000Z',
  ...(dueDate === undefined ? {} : { dueDate }),
});

describe('what to take next, with due dates and sizes (F21, ADR 0038)', () => {
  it('suggests the tickets with a reason, with the reasons', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    createTicket(ctx, { title: 'Export orders' });
    setPriority(ctx, { key: 'LOC-2', priority: 'urgent' });
    setSize(ctx, { key: 'LOC-2', size: 'small' });
    const suggested = suggestNext(ctx, {});
    expect(suggested.ok && suggested.value.suggestions).toEqual([
      { key: 'LOC-2', title: 'Export orders', reasons: ['priorité urgente', 'gain rapide'] },
    ]);
  });

  it('does not suggest a ticket an agent is working on', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    setPriority(ctx, { key: 'LOC-1', priority: 'urgent' });
    setDueDate(ctx, { key: 'LOC-1', dueDate: '2026-10-19' });
    // What an agent writes on the ticket shows it at work (ADR 0028).
    setSize(ctx.as(agent), { key: 'LOC-1', size: 'large' });
    const suggested = suggestNext(ctx, {});
    expect(suggested.ok && suggested.value.suggestions).toEqual([]);
  });

  it('takes the due date of a Jira ticket from Jira, and refuses to set it by hand', async () => {
    const ctx = testContext();
    ctx.jira = () => Promise.resolve([issue('2026-10-25')]);
    await loadFromJira(ctx, {});
    ctx.jira = () => Promise.resolve([issue('2026-10-28')]);
    await loadFromJira(ctx, {});
    const ticket = getTicket(ctx, { key: 'DEMO-1' });
    expect(ticket.ok && ticket.value.dueDate).toBe('2026-10-28');
    expect(setDueDate(ctx, { key: 'DEMO-1', dueDate: null })).toEqual({
      ok: false,
      error: 'jiraOwnsDueDate',
    });
  });
});
