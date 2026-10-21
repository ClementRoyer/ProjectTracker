import type { TicketSummary } from '@project-tracker/contract';
import { shortDate, since } from './format';

/** Who must act on the ticket: the groups of the list, in the order of the validated mockup. */
export type GroupId = 'me' | 'agent' | 'other' | 'stale' | 'none' | 'done';

export const GROUP_TITLES: Readonly<Record<GroupId, string>> = {
  me: 'À TOI',
  agent: 'LES AGENTS AVANCENT',
  other: 'ATTEND QUELQU’UN D’AUTRE',
  stale: 'SANS NOUVELLES',
  none: 'PAS COMMENCÉS',
  done: 'TERMINÉS',
};

const GROUP_ORDER: readonly GroupId[] = ['me', 'agent', 'other', 'stale', 'none', 'done'];

export const PHASE_LABELS = {
  todo: 'À faire',
  analysis: 'Analyse',
  development: 'Développement',
  test: 'Test',
  qaDelivery: 'Livraison qualité',
  qaValidation: 'Validation qualité',
} as const;

export const PHASES = Object.keys(PHASE_LABELS) as (keyof typeof PHASE_LABELS)[];

export type SortOrder = 'wait' | 'activity' | 'phase' | 'priority' | 'key';

/** Most urgent first (ADR 0032). */
export const PRIORITY_LABELS = {
  urgent: 'Urgente',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
} as const;

const PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'] as const;

/** The priority a select gives back, or null for anything else. */
export function toPriority(value: string): TicketSummary['priority'] | null {
  return PRIORITY_ORDER.find((priority) => priority === value) ?? null;
}

export interface TicketGroup {
  id: GroupId;
  title: string;
  tickets: TicketSummary[];
}

export function groupOf(ticket: TicketSummary): GroupId {
  const { situation } = ticket;
  if (situation.closedAt !== null) return 'done';
  if (situation.wait?.kind === 'developer' || ticket.readyToClose) return 'me';
  if (situation.wait !== null) return 'other';
  if (ticket.stale) return 'stale';
  return ticket.working || isTaken(ticket) ? 'agent' : 'none';
}

/** Someone holds the ticket, or it has moved since it was created. */
function isTaken(ticket: TicketSummary): boolean {
  const { phase, progress } = ticket.situation;
  return ticket.assignees.length > 0 || phase !== 'todo' || progress.state !== 'notStarted';
}

export function groupTickets(tickets: readonly TicketSummary[]): TicketGroup[] {
  return GROUP_ORDER.map((id) => ({
    id,
    title: GROUP_TITLES[id],
    tickets: tickets.filter((ticket) => groupOf(ticket) === id),
  })).filter((group) => group.tickets.length > 0);
}

const byKey = new Intl.Collator('fr', { numeric: true });

const COMPARE: Readonly<Record<SortOrder, (a: TicketSummary, b: TicketSummary) => number>> = {
  // Without a wait, a ticket goes after those that wait.
  wait: (a, b) => (a.situation.wait?.since ?? '~').localeCompare(b.situation.wait?.since ?? '~'),
  activity: (a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt),
  phase: (a, b) => PHASES.indexOf(b.situation.phase) - PHASES.indexOf(a.situation.phase),
  priority: (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  key: (a, b) => byKey.compare(a.key, b.key),
};

export function sortTickets(tickets: readonly TicketSummary[], order: SortOrder): TicketSummary[] {
  return [...tickets].sort(COMPARE[order]);
}

export function progressText(ticket: TicketSummary): string {
  if (ticket.situation.closedAt !== null) return 'Terminé';
  const { progress } = ticket.situation;
  switch (progress.state) {
    case 'notStarted':
      return 'Pas démarré';
    case 'inProgress':
      return `En cours : ${progress.note}`;
    case 'done':
      return 'Fait';
  }
}

/** The pill of a row: who or what the ticket waits for, and since when. */
export function waitText(ticket: TicketSummary, now: string): string {
  const { wait, closedAt } = ticket.situation;
  if (closedAt !== null) return `Clos le ${shortDate(closedAt)}`;
  if (wait !== null) {
    const waited = since(wait.since, now);
    switch (wait.kind) {
      case 'developer':
        return `Attend ta réponse ${waited}`;
      case 'backend':
        return `Attend le back-end ${waited}`;
      case 'resource':
        return `Attend la ressource « ${wait.detail} » ${waited}`;
      case 'fileHold':
        return `Attend un fichier tenu : ${wait.detail}`;
      case 'endUser':
      case 'partner':
        return `Attend « ${wait.detail} » ${waited}`;
    }
  }
  return idleText(ticket, now);
}

function idleText(ticket: TicketSummary, now: string): string {
  if (ticket.readyToClose) return 'À déclarer terminé';
  if (ticket.stale) return `Sans nouvelles ${since(ticket.lastActivityAt, now)}`;
  const agentName = ticket.assignees.find((assignee) => assignee.kind === 'agent')?.name;
  if (ticket.working) return `${agentName ?? 'Un agent'} travaille`;
  if (agentName !== undefined && agentName !== null) return `Pris par ${agentName}`;
  return ticket.assignees.length > 0 ? 'Pris par toi' : 'Personne ne l’a pris';
}
