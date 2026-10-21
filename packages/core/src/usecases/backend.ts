import type * as op from '@project-tracker/contract';
import { fail, ok, type Result } from '../domain';
import {
  allTickets,
  appendEntry,
  endExecution,
  findExecution,
  heldMirrorFiles,
  inTransaction,
  insertBackendRequest,
  insertDelivery,
  insertExecution,
  insertQuestion,
  insertUsage,
  listEntries,
  pendingBackendRequests,
  saveLauncher,
  setBackendRequestStatus,
  ticketsWithRunningExecution,
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
import { backendPrompt } from './backend-prompt';
import { refreshWait } from './situation';

export function requestBackend(
  ctx: UsecaseContext,
  input: InputOf<typeof op.requestBackend>,
): Result<OutputOf<typeof op.requestBackend>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  if (loaded.value.record.situation.closedAt !== undefined) return fail('ticketClosed');
  const requestId = ctx.newId();
  inTransaction(ctx.db, () => {
    addRequest(ctx, loaded.value, input.text, requestId);
  });
  return ok({ requestId });
}

/** A request for the back-end: its text in the journal, word for word, and a pending request (ADR 0010). */
export function addRequest(
  ctx: UsecaseContext,
  loaded: LoadedTicket,
  text: string,
  requestId = ctx.newId(),
): void {
  const entryId = ctx.newId();
  const at = ctx.now();
  appendEntry(ctx.db, {
    id: entryId,
    ticketId: loaded.ticket.id,
    entryType: 'request',
    ...authorOf(ctx.actor),
    role: 'backend',
    body: text,
    createdAt: at,
  });
  insertBackendRequest(ctx.db, {
    id: requestId,
    ticketId: loaded.ticket.id,
    entryId,
    createdAt: at,
  });
  refreshWait(ctx, loaded, at);
}

export function launcherHeartbeat(
  ctx: UsecaseContext,
  input: InputOf<typeof op.launcherHeartbeat>,
): Result<OutputOf<typeof op.launcherHeartbeat>, UsecaseError> {
  const at = ctx.now();
  saveLauncher(ctx.db, { id: ctx.newId(), name: input.name, lastSeenAt: at, holds: input.holds });
  return ok({ at });
}

/** The oldest ready request: none of a ticket that already runs one, none waiting for a file still held. */
export function takeBackendRequest(
  ctx: UsecaseContext,
  input: InputOf<typeof op.takeBackendRequest>,
): Result<OutputOf<typeof op.takeBackendRequest>, UsecaseError> {
  const at = ctx.now();
  const launcherId = saveLauncher(ctx.db, {
    id: ctx.newId(),
    name: input.launcher,
    lastSeenAt: at,
  });
  const busy = ticketsWithRunningExecution(ctx.db);
  const held = heldMirrorFiles(ctx.db);
  const ready = pendingBackendRequests(ctx.db).find(
    (request) =>
      !busy.has(request.ticketId) && !(request.blockedOn && held.has(request.blockedOn.path)),
  );
  if (!ready) return ok({ request: null });
  const ticket = allTickets(ctx.db).find((candidate) => candidate.id === ready.ticketId);
  const loaded = ticket ? loadTicket(ctx, ticket.key) : null;
  if (!loaded?.ok) return ok({ request: null });
  const journal = listEntries(ctx.db, ready.ticketId);
  const text = journal.find((entry) => entry.id === ready.entryId)?.body ?? '';
  const executionId = ctx.newId();
  inTransaction(ctx.db, () => {
    setBackendRequestStatus(ctx.db, ready.id, 'taken');
    insertExecution(ctx.db, { id: executionId, requestId: ready.id, launcherId, startedAt: at });
  });
  const { ticket: found, record } = loaded.value;
  return ok({
    request: {
      requestId: ready.id,
      executionId,
      key: found.key,
      prompt: backendPrompt(found, record, journal, text),
    },
  });
}

type FinishInput = InputOf<typeof op.finishExecution>;

/** The result of an execution: in the journal, brought to the front, and the request done, failed or waiting. */
export function finishExecution(
  ctx: UsecaseContext,
  input: FinishInput,
): Result<OutputOf<typeof op.finishExecution>, UsecaseError> {
  const execution = findExecution(ctx.db, input.executionId);
  if (!execution) return fail('executionNotFound');
  if (execution.endedAt !== null) return fail('executionFinished');
  const ticket = allTickets(ctx.db).find((candidate) => candidate.id === execution.ticketId);
  const loaded = ticket ? loadTicket(ctx, ticket.key) : null;
  if (!loaded?.ok) return fail('ticketNotFound');
  const status = statusOf(input);
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    journalReply(ctx, loaded.value, input, at);
    if (input.undeclared.length > 0) {
      appendEntry(ctx.db, {
        id: ctx.newId(),
        ticketId: execution.ticketId,
        entryType: 'situationChange',
        authorKind: 'launcher',
        role: 'backend',
        body: `Modification non déclarée : ${input.undeclared.join(', ')}${input.uncertainAuthor ? ' (auteur incertain)' : ''}`,
        createdAt: at,
      });
    }
    for (const line of input.usage ?? []) {
      insertUsage(ctx.db, {
        id: ctx.newId(),
        ticketId: execution.ticketId,
        ...line,
        provenance: 'measured',
        at,
      });
    }
    endExecution(ctx.db, execution.id, {
      endedAt: at,
      status: status === 'waiting' ? 'blocked' : status,
      blockedOn: input.blockedOn ?? null,
      undeclared: input.undeclared,
    });
    setBackendRequestStatus(ctx.db, execution.requestId, status === 'waiting' ? 'pending' : status);
    refreshWait(ctx, loaded.value, at);
  });
  return ok({ status });
}

function statusOf(input: FinishInput): 'done' | 'failed' | 'waiting' {
  if (input.failure !== undefined) return 'failed';
  return input.blockedOn ? 'waiting' : 'done';
}

function replyBody(input: FinishInput): string {
  if (input.reply) return input.reply.message;
  return input.raw ?? `Échec du back-end : ${input.failure ?? 'raison inconnue'}`;
}

/** The reply in the journal, word for word, and brought to the front assignee (ADR 0007). */
function journalReply(
  ctx: UsecaseContext,
  loaded: LoadedTicket,
  input: FinishInput,
  at: string,
): void {
  const ticketId = loaded.ticket.id;
  const entryId = ctx.newId();
  appendEntry(ctx.db, {
    id: entryId,
    ticketId,
    entryType: 'exchange',
    authorKind: 'launcher',
    role: 'backend',
    body: replyBody(input),
    data: {
      executionId: input.executionId,
      structured: input.reply !== undefined,
      reply: input.reply ?? null,
      changedFiles: input.changedFiles,
      seconds: input.seconds,
    },
    createdAt: at,
  });
  insertDelivery(ctx.db, { entryId, ticketId, role: 'front', sessionId: null });
  if (input.reply?.status === 'question' && input.reply.question) {
    askFromBackend(ctx, {
      ticketId,
      text: input.reply.message,
      question: input.reply.question,
      at,
    });
  }
}

/** A question of the back-end for the developer; the agent is gone, so the answer will start a new execution. */
function askFromBackend(
  ctx: UsecaseContext,
  {
    ticketId,
    text,
    question,
    at,
  }: {
    ticketId: string;
    text: string;
    question: { context: string; options: string[]; recommendation: string };
    at: string;
  },
): void {
  const questionId = ctx.newId();
  appendEntry(ctx.db, {
    id: questionId,
    ticketId,
    entryType: 'question',
    authorKind: 'launcher',
    role: 'backend',
    body: text,
    data: question,
    createdAt: at,
  });
  insertQuestion(ctx.db, {
    entryId: questionId,
    ticketId,
    options: question.options,
    recommendation: question.recommendation,
    status: 'open',
  });
}
