import { z } from 'zod';
import { defineOperation } from './operation';
import { ticketKey } from './ticket';

/** The end-of-turn reply of a back-end agent (ADR 0017, 0020): the launcher sets the ticket itself. */
export const backendReply = z.object({
  status: z.enum(['done', 'inProgress', 'blocked', 'question']),
  message: z.string().describe('Readable message, for the front agent and the developer'),
  question: z
    .object({ context: z.string(), options: z.array(z.string()), recommendation: z.string() })
    .nullable(),
  progress: z.object({ done: z.array(z.string()), remaining: z.array(z.string()) }),
  changedFiles: z.array(z.string()),
});

export const usageLine = z.object({
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
});

export const backendJob = z.object({
  requestId: z.string(),
  executionId: z.string(),
  key: z.string(),
  prompt: z.string(),
});

export const requestBackend = defineOperation({
  name: 'requestBackend',
  description:
    'Sends a request to the ticket back-end; the launcher picks it up and starts an agent on the back-end server.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, text: z.string().min(1) }),
  output: z.object({ requestId: z.string() }),
});

export const launcherHeartbeat = defineOperation({
  name: 'launcherHeartbeat',
  description: 'Launcher sign of life: running executions and files held in the mirror.',
  callers: ['launcher'],
  input: z.object({
    name: z.string().min(1),
    running: z.array(z.string()),
    holds: z.array(z.object({ path: z.string(), key: z.string() })),
  }),
  output: z.object({ at: z.string() }),
});

export const takeBackendRequest = defineOperation({
  name: 'takeBackendRequest',
  description:
    'The launcher takes the oldest ready request; at most one execution at a time per ticket.',
  callers: ['launcher'],
  longPoll: true,
  input: z.object({
    launcher: z.string().min(1),
    waitSeconds: z.number().int().min(0).max(60).optional(),
  }),
  output: z.object({ request: backendJob.nullable() }),
});

export const finishExecution = defineOperation({
  name: 'finishExecution',
  description:
    'The launcher returns the result of an execution: the agent reply, measured changed files, usage, or failure.',
  callers: ['launcher'],
  input: z.object({
    executionId: z.string(),
    reply: backendReply.optional(),
    raw: z.string().optional(),
    failure: z.string().optional(),
    changedFiles: z.array(z.string()),
    undeclared: z.array(z.string()),
    uncertainAuthor: z.boolean(),
    blockedOn: z.object({ path: z.string(), heldBy: z.string() }).optional(),
    seconds: z.number().nonnegative(),
    usage: z.array(usageLine).optional(),
  }),
  output: z.object({ status: z.enum(['done', 'failed', 'waiting']) }),
});

export const recordUsage = defineOperation({
  name: 'recordUsage',
  description:
    'Records AI usage, measured (by the adapter) or declared (by the agent), attached to the ticket the conversation holds.',
  callers: ['agent'],
  input: z.object({
    key: ticketKey.optional(),
    provenance: z.enum(['measured', 'declared']),
    usage: z.array(usageLine).min(1),
  }),
  output: z.object({ recorded: z.number() }),
});

export const usageSummary = defineOperation({
  name: 'usageSummary',
  description:
    'AI usage per day, week or month (in the developer time zone), and per ticket: tokens and estimated cost.',
  callers: ['developer'],
  readOnly: true,
  input: z.object({ period: z.enum(['day', 'week', 'month']) }),
  output: z.object({
    current: z.string().describe('The current period: today, this week or this month'),
    currency: z.string().nullable().describe('The currency of the price table, if configured'),
    periods: z.array(
      z.object({
        period: z.string(),
        measuredTokens: z.number(),
        declaredTokens: z.number(),
        unpricedTokens: z.number(),
        estimatedCost: z.number(),
      }),
    ),
    byTicket: z.array(
      z.object({ key: z.string().nullable(), tokens: z.number(), estimatedCost: z.number() }),
    ),
  }),
});

export const backendOperations = [
  requestBackend,
  launcherHeartbeat,
  takeBackendRequest,
  finishExecution,
  recordUsage,
  usageSummary,
] as const;

export type BackendReply = z.infer<typeof backendReply>;
export type BackendJob = z.infer<typeof backendJob>;
export type UsageSummaryView = z.infer<typeof usageSummary.output>;
