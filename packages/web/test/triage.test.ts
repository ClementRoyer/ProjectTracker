import type { WaitingItem } from '@project-tracker/contract';
import { describe, expect, it } from 'vitest';
import { itemId, triageQueue } from '../src/lib/triage';

const question = (id: string, since: string): WaitingItem => ({
  kind: 'question',
  questionId: id,
  key: `K-${id}`,
  title: 'Ticket',
  since,
  text: 'Which rule?',
  question: null,
});

describe('the triage queue', () => {
  it('keeps the oldest first, and sends what was put off to the end', () => {
    const items = [question('q1', '2026-10-20T08:00:00Z'), question('q2', '2026-10-20T09:00:00Z')];
    expect(triageQueue(items, ['q1']).map(itemId)).toEqual(['q2', 'q1']);
  });

  it('still moves on when everything was put off', () => {
    const items = [question('q1', '2026-10-20T08:00:00Z'), question('q2', '2026-10-20T09:00:00Z')];
    expect(triageQueue(items, ['q1', 'q2']).map(itemId)).toEqual(['q1', 'q2']);
    expect(triageQueue(items, ['q2', 'q1']).map(itemId)).toEqual(['q2', 'q1']);
  });

  it('names a ticket to declare done by its key, since it has no question', () => {
    const close: WaitingItem = {
      ...question('x', '2026-10-20T08:00:00Z'),
      kind: 'close',
      questionId: null,
      key: 'K-9',
    };
    expect(itemId(close)).toBe('close:K-9');
  });
});
