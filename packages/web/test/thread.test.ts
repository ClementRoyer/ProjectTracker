import type { EntryView } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { initials, threadOf } from '../src/lib/thread';

const entry = (overrides: Partial<EntryView>): EntryView => ({
  id: 'e1',
  entryType: 'progress',
  authorKind: 'agent',
  author: 'front-1',
  role: 'front',
  body: 'Form done.',
  data: null,
  replyTo: null,
  acknowledgedAt: null,
  createdAt: '2026-10-20T09:00:00.000Z',
  ...overrides,
});

describe('the discussion of a ticket (validated mockup)', () => {
  it('shows what an agent writes as its message', () => {
    expect(threadOf([entry({})])).toEqual([
      expect.objectContaining({
        kind: 'message',
        side: 'other',
        author: 'front-1',
        body: 'Form done.',
      }),
    ]);
  });

  it('shows the developer’s messages on their own side, with whom they go to', () => {
    const [item] = threadOf([
      entry({ entryType: 'exchange', authorKind: 'developer', author: null, role: 'backend' }),
    ]);
    expect(item).toMatchObject({ kind: 'message', side: 'mine', author: 'You', to: '→ back-end' });
  });

  it('says whether the assignee took the developer’s message into account', () => {
    const sent = entry({ entryType: 'answer', authorKind: 'developer', author: null });
    const taken = { ...sent, acknowledgedAt: '2026-10-20T09:05:00.000Z' };
    expect(threadOf([sent])[0]).toMatchObject({ receipt: 'Sent · not acknowledged yet' });
    expect(threadOf([taken])[0]).toMatchObject({ receipt: 'Acknowledged' });
  });

  it('marks a question as meant for the developer', () => {
    expect(threadOf([entry({ entryType: 'question' })])[0]).toMatchObject({ to: '→ you' });
  });

  it('shows changes of situation and Jira loads as marks between messages', () => {
    const items = threadOf([
      entry({ entryType: 'situationChange', authorKind: 'developer', body: 'Phase : Test' }),
      entry({
        entryType: 'jiraImport',
        authorKind: 'jira',
        author: null,
        body: 'Loaded from Jira',
      }),
    ]);
    expect(items.map((item) => item.kind)).toEqual(['mark', 'mark']);
  });

  it('puts decisions forward, with their reason', () => {
    expect(threadOf([entry({ entryType: 'decision', body: 'Start after 3 letters' })])[0]).toEqual(
      expect.objectContaining({
        kind: 'mark',
        strong: true,
        body: 'Decision · Start after 3 letters',
      }),
    );
  });

  it('shows what the launcher brings back as the back-end speaking', () => {
    const [item] = threadOf([entry({ authorKind: 'launcher', author: null, role: 'backend' })]);
    expect(item).toMatchObject({ author: 'back-end', tone: 'backend' });
  });
});

describe('initials of an author', () => {
  it('keeps a letter and the number of an agent name', () => {
    expect([initials('front-1'), initials('agent-front-2'), initials('back-end')]).toEqual([
      'F1',
      'AF2',
      'BE',
    ]);
  });
});
