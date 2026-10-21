import type { Actor } from './actor';
import { fail, ok, type Result } from './result';
import type { Situation } from './situation';
import type { Instant } from './time';

export type ClosingError = 'onlyDeveloperCloses' | 'notValidated' | 'ticketClosed';

/** Only the developer declares a ticket finished, after QA validation. */
export function closeTicket(
  situation: Situation,
  actor: Actor,
  at: Instant,
): Result<Situation, ClosingError> {
  if (actor.kind !== 'developer') return fail('onlyDeveloperCloses');
  if (situation.closedAt !== undefined) return fail('ticketClosed');
  if (!isValidated(situation)) return fail('notValidated');
  return ok({ ...situation, closedAt: at });
}

/** QA validation is done and the ticket is still open: the developer may declare it finished. */
export function isReadyToClose(situation: Situation): boolean {
  return situation.closedAt === undefined && isValidated(situation);
}

function isValidated(situation: Situation): boolean {
  return situation.phase === 'qaValidation' && situation.progress.state === 'done';
}
