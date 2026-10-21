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
    `Tu es l'intervenant back-end du ticket ${ticket.key} : ${ticket.title}.`,
    '',
    `Demande initiale : ${ticket.initialRequest ?? '(aucune)'}`,
    `Situation : ${PHASE_LABELS[record.situation.phase]}, ${describeProgress(record.situation.progress).toLowerCase()}.`,
    '',
    'Journal du ticket, du plus ancien au plus récent :',
    ...lines,
    '',
    'Demande à traiter maintenant :',
    request,
    '',
    'Termine par la réponse structurée demandée : statut, message lisible pour le front, question éventuelle au développeur (contexte, options, recommandation), avancement, fichiers modifiés.',
  ].join('\n');
}
