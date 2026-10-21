import { describe, expect, it } from 'vitest';
import { appendEntry, insertQuestion } from '../../src/store';
import {
  changePhase,
  closeTicket,
  createTicket,
  declareWait,
  getTicket,
  reportProgress,
} from '../../src/usecases';
import { agent, testContext } from './context';

const withTicket = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Search by customer name' });
  return ctx;
};

const situationOf = (ctx: ReturnType<typeof testContext>): unknown => {
  const ticket = getTicket(ctx, { key: 'LOC-1' });
  return ticket.ok ? ticket.value.situation : null;
};

const lastEntry = (ctx: ReturnType<typeof testContext>): string | undefined => {
  const ticket = getTicket(ctx, { key: 'LOC-1' });
  return ticket.ok ? ticket.value.entries.at(-1)?.body : undefined;
};

const askQuestion = (ctx: ReturnType<typeof testContext>): void => {
  appendEntry(ctx.db, {
    id: 'q1',
    ticketId: 'id-1',
    entryType: 'question',
    authorKind: 'agent',
    body: 'Which rule?',
    createdAt: '2026-10-19T12:00:00.000Z',
  });
  insertQuestion(ctx.db, { entryId: 'q1', ticketId: 'id-1', options: [], status: 'open' });
};

describe('situation', () => {
  it('records the progress and journals it', () => {
    const ctx = withTicket();
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'inProgress', note: 'form done' } });
    expect(situationOf(ctx)).toMatchObject({
      progress: { state: 'inProgress', note: 'form done' },
    });
    expect(lastEntry(ctx)).toBe('Avancement : en cours, form done');
  });

  it('refuses « in progress » without saying where things stand', () => {
    const ctx = withTicket();
    expect(
      reportProgress(ctx, { key: 'LOC-1', progress: { state: 'inProgress', note: ' ' } }),
    ).toEqual({
      ok: false,
      error: 'progressNoteRequired',
    });
  });

  it('starts the progress again when the phase changes, and journals both phases', () => {
    const ctx = withTicket();
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'done' } });
    changePhase(ctx, { key: 'LOC-1', phase: 'development' });
    expect(situationOf(ctx)).toMatchObject({
      phase: 'development',
      progress: { state: 'notStarted' },
    });
    expect(lastEntry(ctx)).toBe('Phase : À faire → Développement');
  });

  it('lets only the developer close a ticket', () => {
    const ctx = withTicket();
    expect(closeTicket(ctx.as(agent), { key: 'LOC-1' })).toEqual({
      ok: false,
      error: 'onlyDeveloperCloses',
    });
  });

  it('closes a ticket only after a done QA validation', () => {
    const ctx = withTicket();
    expect(closeTicket(ctx, { key: 'LOC-1' })).toEqual({ ok: false, error: 'notValidated' });
    changePhase(ctx, { key: 'LOC-1', phase: 'qaValidation' });
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'done' } });
    const closed = closeTicket(ctx, { key: 'LOC-1' });
    expect(closed.ok && closed.value.situation.closedAt).not.toBeNull();
  });

  it('refuses any change once the ticket is closed', () => {
    const ctx = withTicket();
    changePhase(ctx, { key: 'LOC-1', phase: 'qaValidation' });
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'done' } });
    closeTicket(ctx, { key: 'LOC-1' });
    expect(changePhase(ctx, { key: 'LOC-1', phase: 'test' })).toEqual({
      ok: false,
      error: 'ticketClosed',
    });
  });

  it('shows a declared wait on a partner, then lifts it', () => {
    const ctx = withTicket();
    declareWait(ctx, { key: 'LOC-1', wait: { kind: 'partner', detail: 'Payment team' } });
    expect(situationOf(ctx)).toMatchObject({ wait: { kind: 'partner', detail: 'Payment team' } });
    declareWait(ctx, { key: 'LOC-1', wait: null });
    expect(situationOf(ctx)).toMatchObject({ wait: null });
  });

  it('puts an open question for the developer before a declared wait, and keeps the declared one', () => {
    const ctx = withTicket();
    declareWait(ctx, { key: 'LOC-1', wait: { kind: 'partner', detail: 'Payment team' } });
    askQuestion(ctx);
    reportProgress(ctx, {
      key: 'LOC-1',
      progress: { state: 'inProgress', note: 'blocked on a choice' },
    });
    expect(situationOf(ctx)).toMatchObject({ wait: { kind: 'developer' } });
    ctx.db.prepare("UPDATE question SET status = 'answered'").run();
    reportProgress(ctx, { key: 'LOC-1', progress: { state: 'inProgress', note: 'choice made' } });
    expect(situationOf(ctx)).toMatchObject({ wait: { kind: 'partner', detail: 'Payment team' } });
  });
});
