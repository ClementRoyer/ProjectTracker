import { fail, ok, type Result } from './result';
import type { Instant } from './time';

export const PHASES = [
  'todo',
  'analysis',
  'development',
  'test',
  'qaDelivery',
  'qaValidation',
] as const;

export type Phase = (typeof PHASES)[number];

export type Progress =
  { state: 'notStarted' } | { state: 'inProgress'; note: string } | { state: 'done' };

export interface Situation {
  phase: Phase;
  progress: Progress;
  closedAt?: Instant;
}

export type SituationError = 'ticketClosed' | 'alreadyInPhase' | 'progressNoteRequired';

export function newSituation(): Situation {
  return { phase: 'todo', progress: { state: 'notStarted' } };
}

export function moveToPhase(situation: Situation, phase: Phase): Result<Situation, SituationError> {
  if (situation.closedAt !== undefined) return fail('ticketClosed');
  if (situation.phase === phase) return fail('alreadyInPhase');
  return ok({ phase, progress: { state: 'notStarted' } });
}

export function reportProgress(
  situation: Situation,
  progress: Progress,
): Result<Situation, SituationError> {
  if (situation.closedAt !== undefined) return fail('ticketClosed');
  if (progress.state === 'inProgress' && progress.note.trim() === '') {
    return fail('progressNoteRequired');
  }
  return ok({ ...situation, progress });
}
