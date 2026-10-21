import { describe, expect, it } from 'vitest';
import { PHASES, moveToPhase, newSituation, reportProgress } from '../../src/domain';

describe('situation', () => {
  it('lists the phases in the order of a ticket life', () => {
    expect(PHASES).toEqual([
      'todo',
      'analysis',
      'development',
      'test',
      'qaDelivery',
      'qaValidation',
    ]);
  });

  it('starts a new ticket in todo, not started', () => {
    expect(newSituation()).toEqual({ phase: 'todo', progress: { state: 'notStarted' } });
  });

  it('resets progress when the phase changes', () => {
    const inAnalysis = moveToPhase(newSituation(), 'analysis');
    const started = reportProgress(unwrap(inAnalysis), { state: 'inProgress', note: 'Reading' });
    const moved = moveToPhase(unwrap(started), 'development');
    expect(moved).toEqual({
      ok: true,
      value: { phase: 'development', progress: { state: 'notStarted' } },
    });
  });

  it('allows going back to an earlier phase, for corrections after a test', () => {
    const inTest = unwrap(moveToPhase(newSituation(), 'test'));
    expect(moveToPhase(inTest, 'development').ok).toBe(true);
  });

  it('refuses to move to the phase the ticket is already in', () => {
    expect(moveToPhase(newSituation(), 'todo')).toEqual({ ok: false, error: 'alreadyInPhase' });
  });

  it('requires a sentence saying where things stand when work is in progress', () => {
    expect(reportProgress(newSituation(), { state: 'inProgress', note: '  ' })).toEqual({
      ok: false,
      error: 'progressNoteRequired',
    });
  });

  it('refuses any change on a closed ticket', () => {
    const closed = { ...newSituation(), closedAt: '2026-10-19T10:00:00.000Z' };
    expect(moveToPhase(closed, 'analysis')).toEqual({ ok: false, error: 'ticketClosed' });
    expect(reportProgress(closed, { state: 'done' })).toEqual({ ok: false, error: 'ticketClosed' });
  });
});

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
