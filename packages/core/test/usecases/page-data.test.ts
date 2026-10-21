import { describe, expect, it } from 'vitest';
import type { UsecaseContext } from '../../src/usecases';
import {
  askQuestion,
  createTicket,
  getTicket,
  identify,
  introduce,
  listTickets,
  listWaitingForMe,
  recordEntry,
  reportWorking,
  takeTicket,
} from '../../src/usecases';
import { testContext } from './context';

type Ctx = ReturnType<typeof testContext>;

const MINUTE = 60_000;

const setUp = (): { ctx: Ctx; front: UsecaseContext } => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Search by customer name' });
  const introduced = introduce(ctx, { name: 'front-1' });
  if (!introduced.ok) throw new Error(introduced.error);
  const session = identify(ctx, introduced.value.token);
  if (!session) throw new Error('unknown token');
  const front = ctx.as(session);
  takeTicket(front, { key: 'LOC-1', role: 'front' });
  return { ctx, front };
};

const summary = (ctx: UsecaseContext): Record<string, unknown> => {
  const listed = listTickets(ctx, {});
  if (!listed.ok) throw new Error(listed.error);
  const [first] = listed.value.tickets;
  if (!first) throw new Error('no ticket');
  return first;
};

const ask = (front: UsecaseContext): void => {
  askQuestion(front, {
    key: 'LOC-1',
    text: 'Which matching rule?',
    context: 'Compound names are not found today.',
    options: ['Start of each word', 'Anywhere'],
    recommendation: 'Start of each word',
  });
};

describe('what the page shows of a ticket (ADR 0028)', () => {
  it('names who holds each role', () => {
    const { ctx } = setUp();
    expect(summary(ctx).assignees).toEqual([{ role: 'front', kind: 'agent', name: 'front-1' }]);
  });

  it('shows the agent at work from the start it signals to the end it signals', () => {
    const { ctx, front } = setUp();
    reportWorking(front, { working: true });
    expect(summary(ctx).working).toBe(true);
    reportWorking(front, { working: false });
    expect(summary(ctx).working).toBe(false);
  });

  it('finds the tickets of the conversation when the agent names none', () => {
    const { front } = setUp();
    expect(reportWorking(front, { working: true })).toEqual({
      ok: true,
      value: { keys: ['LOC-1'] },
    });
  });

  it('deduces work from what the agent writes, until the configured silence', () => {
    const { ctx, front } = setUp();
    recordEntry(front, { key: 'LOC-1', entryType: 'progress', body: 'Form done.' });
    expect(summary(ctx).working).toBe(true);
    ctx.advance(16 * MINUTE);
    expect(summary(ctx).working).toBe(false);
  });

  it('stops showing work once the agent asks the developer', () => {
    const { ctx, front } = setUp();
    recordEntry(front, { key: 'LOC-1', entryType: 'progress', body: 'Form done.' });
    ask(front);
    expect(summary(ctx).working).toBe(false);
  });

  it('says when the ticket can be declared done', () => {
    const { ctx } = setUp();
    expect(summary(ctx).readyToClose).toBe(false);
  });

  it('shows an open question with its context, options and recommendation, until answered', () => {
    const { ctx, front } = setUp();
    ask(front);
    const detail = getTicket(ctx, { key: 'LOC-1' });
    expect(detail.ok && detail.value.openQuestions).toEqual([
      expect.objectContaining({
        text: 'Which matching rule?',
        context: 'Compound names are not found today.',
        options: ['Start of each word', 'Anywhere'],
        recommendation: 'Start of each word',
        author: 'front-1',
        role: 'front',
      }),
    ]);
  });

  it('gives the triage what it needs to answer a question without opening the ticket', () => {
    const { ctx, front } = setUp();
    ask(front);
    const waiting = listWaitingForMe(ctx, {});
    expect(waiting.ok && waiting.value.items[0]?.question).toMatchObject({
      context: 'Compound names are not found today.',
      options: ['Start of each word', 'Anywhere'],
      author: 'front-1',
    });
  });
});
