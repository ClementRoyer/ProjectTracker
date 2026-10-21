import type { WaitingItem } from '@project-tracker/contract';

/**
 * One thing at a time, oldest first; what the developer put off comes back at the end, in the
 * order it was put off, so that putting off again always moves on.
 */
export function triageQueue(
  items: readonly WaitingItem[],
  later: readonly string[],
): WaitingItem[] {
  const now = items.filter((item) => !later.includes(itemId(item)));
  const afterwards = later.flatMap((id) => items.filter((item) => itemId(item) === id));
  return [...now, ...afterwards];
}

export function itemId(item: WaitingItem): string {
  return item.questionId ?? `close:${item.key}`;
}
