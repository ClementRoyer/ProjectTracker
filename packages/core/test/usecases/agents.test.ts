import { describe, expect, it } from 'vitest';
import type { UsecaseContext } from '../../src/usecases';
import {
  acknowledge,
  answerQuestion,
  askQuestion,
  createTicket,
  getTicket,
  identify,
  introduce,
  listInbox,
  listWaitingForMe,
  sendMessage,
  submitReply,
  takeTicket,
} from '../../src/usecases';
import { testContext } from './context';

type Ctx = ReturnType<typeof testContext>;

/** A ticket and an agent conversation that took it as front. */
const setUp = (): { ctx: Ctx; front: UsecaseContext } => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Search by customer name' });
  const front = conversation(ctx, 'front-1');
  takeTicket(front, { key: 'LOC-1', role: 'front' });
  return { ctx, front };
};

const conversation = (ctx: Ctx, name: string): UsecaseContext => {
  const introduced = introduce(ctx, { name, tool: 'claude-code' });
  if (!introduced.ok) throw new Error(introduced.error);
  const session = identify(ctx, introduced.value.token);
  if (!session) throw new Error('unknown token');
  return ctx.as(session);
};

const questionId = (front: UsecaseContext): string => {
  const asked = askQuestion(front, {
    key: 'LOC-1',
    text: 'Which matching rule?',
    options: ['Start of each word', 'Anywhere'],
    recommendation: 'Start of each word',
  });
  if (!asked.ok) throw new Error(asked.error);
  return asked.value.questionId;
};

describe('agent conversations (ADR 0011)', () => {
  it('gives each conversation its own token, and finds it back from the token only', () => {
    const ctx = testContext();
    const first = introduce(ctx, { name: 'front-1' });
    const second = introduce(ctx, { name: 'front-1' });
    expect(first.ok && second.ok && first.value.token !== second.value.token).toBe(true);
    expect(identify(ctx, first.ok ? first.value.token : '')).toMatchObject({ kind: 'agent' });
    expect(identify(ctx, 'not-a-token')).toBeNull();
  });

  it('never stores the token itself', () => {
    const ctx = testContext();
    const introduced = introduce(ctx, { name: 'front-1' });
    const stored = ctx.db
      .prepare('SELECT tokenHash FROM session')
      .all()
      .map((row) => row.tokenHash);
    expect(introduced.ok && stored.includes(introduced.value.token)).toBe(false);
  });

  it('refuses a second agent on a role another agent holds', () => {
    const { ctx } = setUp();
    const other = conversation(ctx, 'front-2');
    expect(takeTicket(other, { key: 'LOC-1', role: 'front' })).toEqual({
      ok: false,
      error: 'roleTaken',
    });
  });

  it('lets a new conversation of the same agent take its ticket back', () => {
    const { ctx } = setUp();
    const resumed = conversation(ctx, 'front-1');
    expect(takeTicket(resumed, { key: 'LOC-1', role: 'front' }).ok).toBe(true);
  });

  it('names the agent who wrote each entry', () => {
    const { ctx, front } = setUp();
    questionId(front);
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)?.author).toBe('front-1');
  });
});

describe('questions and answers (ADR 0007)', () => {
  it('makes the ticket wait for the developer and lists the question for them', () => {
    const { ctx, front } = setUp();
    questionId(front);
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.situation.wait?.kind).toBe('developer');
    const waiting = listWaitingForMe(ctx, {});
    expect(waiting.ok && waiting.value.items[0]?.text).toBe('Which matching rule?');
    expect(waiting.ok && typeof waiting.value.items[0]?.questionId).toBe('string');
  });

  it('delivers the answer to the conversation that asked, once, at its next call', () => {
    const { ctx, front } = setUp();
    const id = questionId(front);
    answerQuestion(ctx, { questionId: id, answer: 'Start of each word.' });
    const inbox = listInbox(front, {});
    expect(
      inbox.ok && inbox.value.items.map((item) => [item.kind, item.body, item.question]),
    ).toEqual([['answer', 'Start of each word.', 'Which matching rule?']]);
    const again = listInbox(front, {});
    expect(again.ok && again.value.items).toEqual([]);
  });

  it('delivers to a new conversation of the agent when the asking one is gone (F15)', () => {
    const { ctx, front } = setUp();
    const id = questionId(front);
    answerQuestion(ctx, { questionId: id, answer: 'Start of each word.' });
    const resumed = conversation(ctx, 'front-1');
    const inbox = listInbox(resumed, {});
    expect(inbox.ok && inbox.value.items.length).toBe(1);
  });

  it('lifts the wait on the developer once the question is answered', () => {
    const { ctx, front } = setUp();
    answerQuestion(ctx, { questionId: questionId(front), answer: 'Start of each word.' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.situation.wait).toBeNull();
  });

  it('refuses a second answer to the same question', () => {
    const { ctx, front } = setUp();
    const id = questionId(front);
    answerQuestion(ctx, { questionId: id, answer: 'Start of each word.' });
    expect(answerQuestion(ctx, { questionId: id, answer: 'Anywhere.' })).toEqual({
      ok: false,
      error: 'questionAnswered',
    });
  });

  it('shows the developer that the agent took the answer into account', () => {
    const { ctx, front } = setUp();
    const id = questionId(front);
    const answered = answerQuestion(ctx, { questionId: id, answer: 'Start of each word.' });
    if (!answered.ok) throw new Error(answered.error);
    listInbox(front, {});
    acknowledge(front, { entryId: answered.value.entryId });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    const answer = ticket.ok
      ? ticket.value.entries.find((e) => e.id === answered.value.entryId)
      : undefined;
    expect(answer?.acknowledgedAt).not.toBeNull();
  });
});

describe('messages to an assignee (F14, F33)', () => {
  it('delivers a message of the developer to the agent holding the role', () => {
    const { ctx, front } = setUp();
    sendMessage(ctx, { key: 'LOC-1', to: 'front', body: 'Also search by phone number later.' });
    const inbox = listInbox(front, {});
    expect(inbox.ok && inbox.value.items.map((item) => [item.kind, item.body])).toEqual([
      ['message', 'Also search by phone number later.'],
    ]);
  });
});

describe('structured end-of-turn reply (ADR 0017, 0020)', () => {
  it('journals the readable message on the ticket the conversation holds', () => {
    const { ctx, front } = setUp();
    submitReply(front, { reply: { message: 'Form done, sorting next.', question: null } });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)).toMatchObject({
      entryType: 'progress',
      body: 'Form done, sorting next.',
    });
  });

  it('turns the question of the reply into a question for the developer', () => {
    const { ctx, front } = setUp();
    submitReply(front, {
      reply: {
        message: 'I need a choice.',
        question: {
          context: 'Names with several words are missed.',
          options: ['Start of each word', 'Anywhere'],
          recommendation: 'Start of each word',
        },
      },
    });
    const waiting = listWaitingForMe(ctx, {});
    expect(waiting.ok && waiting.value.items.length).toBe(1);
  });

  it('keeps an unreadable reply as it is, marked as not structured', () => {
    const { ctx, front } = setUp();
    const stored = submitReply(front, { raw: 'I am done, no JSON today.' });
    expect(stored.ok && stored.value.structured).toBe(false);
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)).toMatchObject({
      body: 'I am done, no JSON today.',
      data: { structured: false },
    });
  });

  it('asks which ticket when the conversation holds several', () => {
    const { ctx, front } = setUp();
    createTicket(ctx, { title: 'Export orders' });
    takeTicket(front, { key: 'LOC-2', role: 'front' });
    expect(submitReply(front, { raw: 'done' })).toEqual({ ok: false, error: 'ticketAmbiguous' });
    expect(submitReply(front, { key: 'LOC-2', raw: 'done' }).ok).toBe(true);
  });
});
