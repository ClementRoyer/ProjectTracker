import { describe, expect, it } from 'vitest';
import { createTicket, forgetWorktree, getTicket, setWorktree } from '../../src/usecases';
import { testContext } from './context';

describe('the working folder of a ticket (ADR 0041)', () => {
  it('records the folder and its branch, and notes it in the journal', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    setWorktree(ctx, { key: 'LOC-1', path: '.worktrees/LOC-1', branch: 'ticket/LOC-1' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.worktree).toEqual({
      path: '.worktrees/LOC-1',
      branch: 'ticket/LOC-1',
    });
    expect(ticket.ok && ticket.value.entries.at(-1)?.body).toBe(
      'Dossier de travail : .worktrees/LOC-1 (branche ticket/LOC-1)',
    );
  });

  it('forgets the folder once it is removed', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    setWorktree(ctx, { key: 'LOC-1', path: '.worktrees/LOC-1', branch: 'ticket/LOC-1' });
    forgetWorktree(ctx, { key: 'LOC-1' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.worktree).toBeNull();
    expect(ticket.ok && ticket.value.entries.at(-1)?.body).toBe('Dossier de travail retiré');
  });

  it('has no folder by default: the ticket may be worked on in the main folder', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.worktree).toBeNull();
  });
});
