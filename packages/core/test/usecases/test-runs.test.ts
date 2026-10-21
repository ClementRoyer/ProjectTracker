import { describe, expect, it } from 'vitest';
import { createTicket, getTicket, recordTestRun } from '../../src/usecases';
import { agent, testContext } from './context';

describe('test runs of a ticket (F17, ADR 0034)', () => {
  it('notes a run in the journal: its kind, whether it passed, and what was said', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    recordTestRun(ctx.as(agent), { key: 'LOC-1', kind: 'auto', passed: false, note: '14 of 16' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    const last = ticket.ok ? ticket.value.entries.at(-1) : undefined;
    expect(last).toMatchObject({
      entryType: 'testRun',
      body: 'Automatic tests failed: 14 of 16',
      data: { kind: 'auto', passed: false },
    });
  });

  it('keeps the run itself, beside the journal', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    recordTestRun(ctx, { key: 'LOC-1', kind: 'user', passed: true });
    expect(ctx.db.prepare('SELECT kind, result FROM testRun').all()).toEqual([
      { kind: 'user', result: 'passed' },
    ]);
  });
});
