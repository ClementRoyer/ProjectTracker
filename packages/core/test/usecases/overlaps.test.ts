import { describe, expect, it } from 'vitest';
import {
  closeTicket,
  changePhase,
  createTicket,
  getTicket,
  listTickets,
  reportChangedFiles,
  reportProgress,
} from '../../src/usecases';
import { testContext } from './context';

const threeTickets = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Search by customer name' });
  createTicket(ctx, { title: 'Export orders' });
  createTicket(ctx, { title: 'Rename a column' });
  return ctx;
};

describe('changed files and overlaps (ADR 0008)', () => {
  it('names the other tickets that change the same files', () => {
    const ctx = threeTickets();
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/api/customers.ts', 'src/ui/list.ts'] });
    const reported = reportChangedFiles(ctx, {
      key: 'LOC-2',
      files: ['src/ui/list.ts', 'src/export.ts'],
    });
    expect(reported.ok && reported.value.overlaps).toEqual([
      { path: 'src/ui/list.ts', keys: ['LOC-1'] },
    ]);
  });

  it('replaces the previous report of the ticket', () => {
    const ctx = threeTickets();
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/ui/list.ts'] });
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/api/customers.ts'] });
    const reported = reportChangedFiles(ctx, { key: 'LOC-2', files: ['src/ui/list.ts'] });
    expect(reported.ok && reported.value.overlaps).toEqual([]);
  });

  it('shows the overlapping tickets in the list', () => {
    const ctx = threeTickets();
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/ui/list.ts'] });
    reportChangedFiles(ctx, { key: 'LOC-3', files: ['src/ui/list.ts'] });
    const list = listTickets(ctx, {});
    expect(list.ok && list.value.tickets.map((t) => [t.key, t.overlaps])).toEqual([
      ['LOC-1', ['LOC-3']],
      ['LOC-2', []],
      ['LOC-3', ['LOC-1']],
    ]);
  });

  it('forgets the files of a closed ticket', () => {
    const ctx = threeTickets();
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/ui/list.ts'] });
    changePhase(ctx, { key: 'LOC-1', phase: 'qaValidation' });
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'done' } });
    closeTicket(ctx, { key: 'LOC-1' });
    const reported = reportChangedFiles(ctx, { key: 'LOC-2', files: ['src/ui/list.ts'] });
    expect(reported.ok && reported.value.overlaps).toEqual([]);
  });

  it('lists the changed files on the ticket, each with the other tickets that change it (F23)', () => {
    const ctx = threeTickets();
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['src/ui/list.ts', 'src/api/customers.ts'] });
    reportChangedFiles(ctx, { key: 'LOC-2', files: ['src/ui/list.ts'] });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.changedFiles).toEqual([
      { path: 'src/api/customers.ts', repo: null, sharedWith: [] },
      { path: 'src/ui/list.ts', repo: null, sharedWith: ['LOC-2'] },
    ]);
  });

  it('names the repository of each changed file, when the project names its repositories (ADR 0040)', () => {
    const ctx = threeTickets();
    ctx.repos = [
      { name: 'front', path: 'web' },
      { name: 'back', path: 'api' },
    ];
    reportChangedFiles(ctx, { key: 'LOC-1', files: ['api/orders.ts', 'web/list.ts', 'README.md'] });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.changedFiles.map((file) => [file.path, file.repo])).toEqual([
      ['README.md', null],
      ['api/orders.ts', 'back'],
      ['web/list.ts', 'front'],
    ]);
  });
});
