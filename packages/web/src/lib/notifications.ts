import type { Novelty, WaitingItem } from '@project-tracker/contract';

export interface Notice {
  title: string;
  body: string;
  key: string;
}

/** The questions and back-end replies already told, by id. */
export interface Seen {
  questions: ReadonlySet<string>;
  replies: ReadonlySet<string>;
}

const questionIds = (waiting: readonly WaitingItem[]): string[] =>
  waiting.flatMap((item) => (item.questionId === null ? [] : [item.questionId]));

const backendReplies = (novelties: readonly Novelty[]): Novelty[] =>
  novelties.filter((novelty) => novelty.authorKind === 'launcher');

/** What is there when the page opens is not news (ADR 0036). */
export function firstSeen(waiting: readonly WaitingItem[], novelties: readonly Novelty[]): Seen {
  return {
    questions: new Set(questionIds(waiting)),
    replies: new Set(backendReplies(novelties).map((novelty) => novelty.id)),
  };
}

/** The new questions for the developer and the new back-end replies, each told once. */
export function newNotices(
  seen: Seen,
  waiting: readonly WaitingItem[],
  novelties: readonly Novelty[],
): { notices: Notice[]; seen: Seen } {
  const questions = waiting.filter(
    (item) => item.questionId !== null && !seen.questions.has(item.questionId),
  );
  const replies = backendReplies(novelties).filter((novelty) => !seen.replies.has(novelty.id));
  return {
    notices: [
      ...questions.map((item) => ({
        title: 'Question for you',
        body: `${item.key} · ${item.text}`,
        key: item.key,
      })),
      ...replies.map((novelty) => ({
        title: 'Reply from the back-end',
        body: `${novelty.key} · ${novelty.body}`,
        key: novelty.key,
      })),
    ],
    seen: {
      questions: new Set([...seen.questions, ...questionIds(waiting)]),
      replies: new Set([...seen.replies, ...replies.map((novelty) => novelty.id)]),
    },
  };
}

export function tabTitle(waiting: number): string {
  return waiting > 0 ? `(${String(waiting)}) project-tracker` : 'project-tracker';
}
