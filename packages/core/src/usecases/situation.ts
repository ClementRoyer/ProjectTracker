import type * as op from '@project-tracker/contract';
import {
  closeTicket as closeSituation,
  computeWait,
  fail,
  moveToPhase,
  ok,
  reportProgress as applyProgress,
  type EntryType,
  type Result,
  type Situation,
  type Wait,
} from '../domain';
import {
  activeBackendRequestDates,
  blockedOnFiles,
  appendEntry,
  inTransaction,
  latestDeclaredWait,
  openQuestions,
  queuedResources,
  readSituation,
  saveSituation,
} from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type LoadedTicket,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { describeProgress, PHASE_LABELS, toSituationView } from './views';

type SituationOutput = OutputOf<typeof op.reportProgress>;

export function reportProgress(
  ctx: UsecaseContext,
  input: InputOf<typeof op.reportProgress>,
): Result<SituationOutput, UsecaseError> {
  return change(ctx, input.key, (situation) => {
    const next = applyProgress(situation, input.progress);
    return next.ok
      ? ok({ situation: next.value, entryType: 'progress', body: describeProgress(input.progress) })
      : next;
  });
}

export function changePhase(
  ctx: UsecaseContext,
  input: InputOf<typeof op.changePhase>,
): Result<SituationOutput, UsecaseError> {
  return change(ctx, input.key, (situation) => {
    const next = moveToPhase(situation, input.phase);
    if (!next.ok) return next;
    const body = `Phase : ${PHASE_LABELS[situation.phase]} → ${PHASE_LABELS[input.phase]}`;
    return ok({
      situation: next.value,
      entryType: 'situationChange',
      body,
      data: { from: situation.phase, to: input.phase },
    });
  });
}

export function closeTicket(
  ctx: UsecaseContext,
  input: InputOf<typeof op.closeTicket>,
): Result<SituationOutput, UsecaseError> {
  const at = ctx.now();
  return change(ctx, input.key, (situation) => {
    const next = closeSituation(situation, ctx.actor, at);
    return next.ok
      ? ok({ situation: next.value, entryType: 'situationChange', body: 'Ticket déclaré terminé' })
      : next;
  });
}

/** A wait outside the tool (end user, partner), declared by hand; null lifts it. */
export function declareWait(
  ctx: UsecaseContext,
  input: InputOf<typeof op.declareWait>,
): Result<SituationOutput, UsecaseError> {
  return change(ctx, input.key, (situation) => {
    if (situation.closedAt !== undefined) return fail('ticketClosed');
    const body = input.wait === null ? 'Attente levée' : `Attente déclarée : ${input.wait.detail}`;
    return ok({
      situation,
      entryType: 'situationChange',
      body,
      data: { declaredWait: input.wait },
    });
  });
}

interface Change {
  situation: Situation;
  entryType: EntryType;
  body: string;
  data?: unknown;
}

/** Applies a change: the journal entry and the new situation are written in one transaction (ADR 0015). */
function change(
  ctx: UsecaseContext,
  key: string,
  decide: (situation: Situation) => Result<Change, UsecaseError>,
): Result<SituationOutput, UsecaseError> {
  const loaded = loadTicket(ctx, key);
  if (!loaded.ok) return loaded;
  const decided = decide(loaded.value.record.situation);
  if (!decided.ok) return decided;
  writeChange(ctx, loaded.value, decided.value);
  const record = readSituation(ctx.db, loaded.value.ticket.id);
  if (!record) throw new Error(`Ticket ${key} lost its situation`);
  return ok({ situation: toSituationView(record) });
}

export function writeChange(ctx: UsecaseContext, loaded: LoadedTicket, decided: Change): void {
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    appendEntry(ctx.db, {
      id: ctx.newId(),
      ticketId: loaded.ticket.id,
      entryType: decided.entryType,
      ...authorOf(ctx.actor),
      body: decided.body,
      ...(decided.data === undefined ? {} : { data: decided.data }),
      createdAt: at,
    });
    saveSituation(ctx.db, {
      ticketId: loaded.ticket.id,
      situation: decided.situation,
      wait: decided.situation.closedAt === undefined ? currentWait(ctx, loaded.ticket.id) : null,
      updatedAt: at,
    });
  });
}

/** What the ticket waits for now: computed from the tool, or declared by hand. */
export function currentWait(ctx: UsecaseContext, ticketId: string): Wait | null {
  const declared = latestDeclaredWait(ctx.db, ticketId);
  return computeWait({
    openQuestions: openQuestions(ctx.db, ticketId).map((question) => ({
      since: question.createdAt,
    })),
    backendRequests: activeBackendRequestDates(ctx.db, ticketId).map((since) => ({ since })),
    queuedResources: queuedResources(ctx.db, ticketId),
    blockedFiles: blockedOnFiles(ctx.db, ticketId),
    ...(declared ? { declared } : {}),
  });
}

/** Saves the situation again with its wait recomputed, after a question or a request changed. */
export function refreshWait(ctx: UsecaseContext, loaded: LoadedTicket, at: string): void {
  const { situation } = loaded.record;
  saveSituation(ctx.db, {
    ticketId: loaded.ticket.id,
    situation,
    wait: situation.closedAt === undefined ? currentWait(ctx, loaded.ticket.id) : null,
    updatedAt: at,
  });
}
