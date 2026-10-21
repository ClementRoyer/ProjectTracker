import { z } from 'zod';
import { defineOperation } from './operation';
import { attachment, role, ticketKey } from './ticket';

/** The end-of-turn reply of a front agent (ADR 0020): a readable message and an optional question. */
export const frontReply = z.object({
  message: z.string().describe('Message lisible par le développeur'),
  question: z
    .object({
      context: z.string(),
      options: z.array(z.string()),
      recommendation: z.string(),
    })
    .nullable(),
});

export const inboxItem = z.object({
  entryId: z.string(),
  key: z.string(),
  kind: z.enum(['answer', 'message']),
  body: z.string(),
  question: z.string().nullable().describe('La question à laquelle répond une réponse'),
  attachments: z.array(attachment.pick({ name: true, path: true, url: true })),
  at: z.string(),
});

export const introduce = defineOperation({
  name: 'introduce',
  description:
    'Présente cette conversation au tracker sous un nom stable (par exemple front-1) ; rend le jeton à joindre à chaque appel.',
  callers: ['agent'],
  input: z.object({ name: z.string().min(1), tool: z.string().optional() }),
  output: z.object({ token: z.string(), agentName: z.string() }),
});

export const takeTicket = defineOperation({
  name: 'takeTicket',
  description:
    'Prend en charge le ticket dans un rôle (front ou back-end) ; un seul intervenant par rôle.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, role }),
  output: z.object({ key: z.string(), role }),
});

export const askQuestion = defineOperation({
  name: 'askQuestion',
  description:
    'Pose une question au développeur, avec le contexte, les options et une recommandation. La réponse arrive plus tard.',
  callers: ['agent'],
  input: z.object({
    key: ticketKey,
    text: z.string().min(1),
    context: z.string().optional(),
    options: z.array(z.string()).optional(),
    recommendation: z.string().optional(),
  }),
  output: z.object({ questionId: z.string() }),
});

export const answerQuestion = defineOperation({
  name: 'answerQuestion',
  description: 'Répond à une question ; la réponse est acheminée à l’agent qui l’attend.',
  callers: ['developer'],
  input: z.object({ questionId: z.string(), answer: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const sendMessage = defineOperation({
  name: 'sendMessage',
  description: 'Écrit à l’intervenant d’un rôle du ticket, sans passer par sa conversation.',
  callers: ['developer'],
  input: z.object({
    key: ticketKey,
    to: role,
    body: z.string().min(1),
    attachments: z
      .array(z.string())
      .optional()
      .describe('Identifiants de pièces jointes du ticket'),
  }),
  output: z.object({ entryId: z.string() }),
});

export const listInbox = defineOperation({
  name: 'listInbox',
  description:
    'Les réponses et messages du développeur pas encore remis à cet agent ; chacun n’est remis qu’une fois.',
  callers: ['agent'],
  input: z.object({}),
  output: z.object({ items: z.array(inboxItem) }),
});

export const acknowledge = defineOperation({
  name: 'acknowledge',
  description: 'Signale au développeur que sa réponse ou son message est pris en compte.',
  callers: ['agent'],
  input: z.object({ entryId: z.string() }),
  output: z.object({ acknowledgedAt: z.string() }),
});

export const submitReply = defineOperation({
  name: 'submitReply',
  description:
    'Remet la réponse de fin de tour d’un agent front (lue par l’adaptateur) ; sans JSON valide, le texte brut est gardé.',
  callers: ['agent'],
  input: z.object({
    key: ticketKey.optional(),
    reply: frontReply.optional(),
    raw: z.string().optional(),
  }),
  output: z.object({ structured: z.boolean() }),
});

export const reportWorking = defineOperation({
  name: 'reportWorking',
  description:
    'Signale que tu commences (working: true) ou que tu as fini (working: false) de travailler sur le ticket ; sans clé, sur les tickets de cette conversation.',
  callers: ['agent'],
  input: z.object({ key: ticketKey.optional(), working: z.boolean() }),
  output: z.object({ keys: z.array(z.string()) }),
});

export const agentOperations = [
  introduce,
  takeTicket,
  askQuestion,
  answerQuestion,
  sendMessage,
  listInbox,
  acknowledge,
  submitReply,
  reportWorking,
] as const;

export type InboxItemView = z.infer<typeof inboxItem>;
export type FrontReply = z.infer<typeof frontReply>;
