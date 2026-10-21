import { describe, expect, it } from 'vitest';
import { assign, type ActiveAssignment } from '../../src/domain';

const front1 = { kind: 'agent', agentId: 'front-1' } as const;
const front2 = { kind: 'agent', agentId: 'front-2' } as const;
const developer = { kind: 'developer' } as const;

describe('assignment', () => {
  it('gives a free role to whoever takes it', () => {
    expect(assign([], { ticketId: 't1', role: 'front', assignee: front1 })).toEqual({
      ok: true,
      value: { ticketId: 't1', role: 'front', assignee: front1 },
    });
  });

  it('keeps one assignee per role: a taken role is refused to another', () => {
    const active: ActiveAssignment[] = [{ ticketId: 't1', role: 'front', assignee: front1 }];
    expect(assign(active, { ticketId: 't1', role: 'front', assignee: front2 })).toEqual({
      ok: false,
      error: { code: 'roleTaken', holder: front1 },
    });
  });

  it('lets the front and back-end roles of one ticket be held by different assignees', () => {
    const active: ActiveAssignment[] = [{ ticketId: 't1', role: 'front', assignee: front1 }];
    const backend = { kind: 'agent', agentId: 'backend-1' } as const;
    expect(assign(active, { ticketId: 't1', role: 'backend', assignee: backend }).ok).toBe(true);
  });

  it('lets one agent hold several tickets', () => {
    const active: ActiveAssignment[] = [{ ticketId: 't1', role: 'front', assignee: front1 }];
    expect(assign(active, { ticketId: 't2', role: 'front', assignee: front1 }).ok).toBe(true);
  });

  it('treats the developer as an assignee like any agent', () => {
    const active: ActiveAssignment[] = [{ ticketId: 't1', role: 'front', assignee: developer }];
    expect(assign(active, { ticketId: 't1', role: 'front', assignee: front1 })).toEqual({
      ok: false,
      error: { code: 'roleTaken', holder: developer },
    });
  });

  it('accepts taking again a role one already holds', () => {
    const active: ActiveAssignment[] = [{ ticketId: 't1', role: 'front', assignee: front1 }];
    expect(assign(active, { ticketId: 't1', role: 'front', assignee: front1 }).ok).toBe(true);
  });
});
