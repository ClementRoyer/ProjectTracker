import type { Entry, Ticket } from '../domain';
import type { SituationRecord } from '../store';
import { describeProgress, PHASE_LABELS } from './views';

/**
 * The launch text of a back-end agent (ADR 0010): the ticket card and the request, sent to the
 * launcher as text only. The agent of any tool reads it; its JSON reply format comes from the launcher.
 */
export function backendPrompt(
  ticket: Ticket,
  record: SituationRecord,
  journal: readonly Entry[],
  request: string,
): string {
  const lines = journal.map(
    (entry) =>
      `- ${entry.createdAt.slice(0, 16).replace('T', ' ')} · ${entry.authorKind}${entry.role ? ` (${entry.role})` : ''} · ${entry.body}`,
  );
  return [
    `You are the back-end assignee of ticket ${ticket.key}: ${ticket.title}.`,
    '',
    `Initial request: ${ticket.initialRequest ?? '(none)'}`,
    `Situation: ${PHASE_LABELS[record.situation.phase]}, ${describeProgress(record.situation.progress).toLowerCase()}.`,
    '',
    'Ticket journal, oldest to newest:',
    ...lines,
    '',
    'Request to handle now:',
    request,
    '',
    'End with the structured reply asked for: status, message the front can read, possible question to the developer (context, options, recommendation), progress, changed files.',
  ].join('\n');
}
