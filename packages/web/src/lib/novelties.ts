import type { Novelty } from '@project-tracker/contract';

export interface NoveltyGroup {
  key: string;
  title: string;
  entries: Novelty[];
}

/** By ticket, the ticket with the latest news first; in each, the newest first. */
export function groupNovelties(novelties: readonly Novelty[]): NoveltyGroup[] {
  const groups = new Map<string, NoveltyGroup>();
  for (const novelty of [...novelties].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const group = groups.get(novelty.key) ?? {
      key: novelty.key,
      title: novelty.title,
      entries: [],
    };
    group.entries.push(novelty);
    groups.set(novelty.key, group);
  }
  return [...groups.values()];
}
