import { describe, expect, it } from 'vitest';
import { closeTicket, type Situation } from '../../src/domain';

const AT = '2026-10-19T10:00:00.000Z';
const validated: Situation = { phase: 'qaValidation', progress: { state: 'done' } };

describe('closing a ticket', () => {
  it('lets the developer close a ticket once QA validation is done', () => {
    expect(closeTicket(validated, { kind: 'developer' }, AT)).toEqual({
      ok: true,
      value: { ...validated, closedAt: AT },
    });
  });

  it('never lets an agent close a ticket', () => {
    expect(closeTicket(validated, { kind: 'agent', agentId: 'front-1' }, AT)).toEqual({
      ok: false,
      error: 'onlyDeveloperCloses',
    });
  });

  it('refuses to close a ticket whose QA validation is not done', () => {
    const inProgress: Situation = {
      phase: 'qaValidation',
      progress: { state: 'inProgress', note: 'Users are testing' },
    };
    expect(closeTicket(inProgress, { kind: 'developer' }, AT)).toEqual({
      ok: false,
      error: 'notValidated',
    });
  });

  it('refuses to close a ticket twice', () => {
    const closed = { ...validated, closedAt: AT };
    expect(closeTicket(closed, { kind: 'developer' }, AT)).toEqual({
      ok: false,
      error: 'ticketClosed',
    });
  });
});
