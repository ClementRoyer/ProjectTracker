import type { Phase } from './situation';
import type { Priority } from './priority';

export type TicketSize = 'small' | 'medium' | 'large';

export interface SuggestionCandidate {
  key: string;
  priority: Priority;
  phase: Phase;
  /** YYYY-MM-DD */
  dueDate: string | null;
  size: TicketSize | null;
}

export interface Suggestion {
  key: string;
  reasons: string[];
}

const MAX_SUGGESTIONS = 3;
const DAY_MS = 86_400_000;
const ALMOST_DONE: readonly Phase[] = ['test', 'qaDelivery', 'qaValidation'];

/** Points per reason (ADR 0038): the strongest first; a ticket without any reason is not suggested. */
export function suggestNext(
  candidates: readonly SuggestionCandidate[],
  today: string,
): Suggestion[] {
  return candidates
    .map((candidate) => ({ key: candidate.key, reasons: reasonsOf(candidate, today) }))
    .filter((scored) => scored.reasons.length > 0)
    .map((scored) => ({
      ...scored,
      points: scored.reasons.reduce((sum, reason) => sum + reason.points, 0),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ key, reasons }) => ({ key, reasons: reasons.map((reason) => reason.text) }));
}

function reasonsOf(
  candidate: SuggestionCandidate,
  today: string,
): { text: string; points: number }[] {
  return [
    dueReason(candidate.dueDate, today),
    priorityReason(candidate.priority),
    ALMOST_DONE.includes(candidate.phase) ? { text: 'presque fini', points: 20 } : null,
    candidate.size === 'small' ? { text: 'gain rapide', points: 15 } : null,
  ].filter((reason) => reason !== null);
}

function dueReason(dueDate: string | null, today: string): { text: string; points: number } | null {
  if (dueDate === null) return null;
  const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / DAY_MS);
  if (days < 0) return { text: 'échéance dépassée', points: 50 };
  if (days <= 2) return { text: `échéance dans ${String(days)} j`, points: 30 };
  if (days <= 7) return { text: `échéance dans ${String(days)} j`, points: 15 };
  return null;
}

function priorityReason(priority: Priority): { text: string; points: number } | null {
  if (priority === 'urgent') return { text: 'priorité urgente', points: 40 };
  if (priority === 'high') return { text: 'priorité haute', points: 20 };
  return null;
}
