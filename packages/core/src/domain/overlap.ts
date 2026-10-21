export interface ChangedFiles {
  ticketId: string;
  paths: readonly string[];
}

export interface Overlap {
  path: string;
  ticketIds: string[];
}

/** A file changed by two tickets or more: a conflict risk, not a block (ADR 0008). */
export function findOverlaps(changes: readonly ChangedFiles[]): Overlap[] {
  const ticketsByPath = new Map<string, Set<string>>();
  for (const { ticketId, paths } of changes) {
    for (const path of paths) {
      const tickets = ticketsByPath.get(path) ?? new Set<string>();
      tickets.add(ticketId);
      ticketsByPath.set(path, tickets);
    }
  }
  return [...ticketsByPath]
    .filter(([, tickets]) => tickets.size > 1)
    .map(([path, tickets]) => ({ path, ticketIds: [...tickets].sort() }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
