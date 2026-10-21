import { z } from 'zod';
import { defineOperation } from './operation';
import { ticketKey } from './ticket';

/** The end-of-turn reply of a back-end agent (ADR 0017, 0020): the launcher sets the ticket itself. */
export const backendReply = z.object({
  status: z.enum(['done', 'inProgress', 'blocked', 'question']),
  message: z.string().describe('Message lisible, pour le front et le développeur'),
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
    'Adresse une demande au back-end du ticket ; le lanceur la relève et démarre un agent sur le serveur back-end.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, text: z.string().min(1) }),
  output: z.object({ requestId: z.string() }),
});

export const launcherHeartbeat = defineOperation({
  name: 'launcherHeartbeat',
  description: 'Signe de vie du lanceur : exécutions en cours et fichiers tenus dans le miroir.',
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
    'Le lanceur prend la plus ancienne demande prête ; au plus une exécution à la fois par ticket.',
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
    'Le lanceur rend le résultat d’une exécution : réponse de l’agent, fichiers modifiés mesurés, usage, ou échec.',
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
    'Enregistre l’usage d’IA mesuré (par l’adaptateur) ou déclaré (par l’agent), rattaché au ticket que tient la conversation.',
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
    'Usage d’IA par jour, semaine ou mois (dans le fuseau du développeur), et par ticket : jetons et coût estimé.',
  callers: ['developer'],
  readOnly: true,
  input: z.object({ period: z.enum(['day', 'week', 'month']) }),
  output: z.object({
    current: z.string().describe('La période en cours : aujourd’hui, cette semaine ou ce mois'),
    currency: z
      .string()
      .nullable()
      .describe('La devise de la table de prix, si elle est configurée'),
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
