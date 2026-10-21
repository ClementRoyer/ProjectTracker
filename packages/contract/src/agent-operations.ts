import { z } from 'zod';
import { defineOperation } from './operation';
import { attachment, role, ticketKey } from './ticket';

/** The end-of-turn reply of a front agent (ADR 0020): a readable message and an optional question. */
export const frontReply = z.object({
  message: z.string().describe('Readable message for the developer'),
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
  question: z.string().nullable().describe('The question an answer replies to'),
  attachments: z.array(attachment.pick({ name: true, path: true, url: true })),
  at: z.string(),
});

export const introduce = defineOperation({
  name: 'introduce',
  description:
    'Introduces this conversation to the tracker under a stable name (for example front-1); returns the token to send with every call.',
  callers: ['agent'],
  input: z.object({ name: z.string().min(1), tool: z.string().optional() }),
  output: z.object({ token: z.string(), agentName: z.string() }),
});

export const takeTicket = defineOperation({
  name: 'takeTicket',
  description: 'Takes over the ticket in a role (front or back-end); only one assignee per role.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, role }),
  output: z.object({ key: z.string(), role }),
});

export const askQuestion = defineOperation({
  name: 'askQuestion',
  description:
    'Asks the developer a question, with context, options and a recommendation. The answer comes later.',
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
  description: 'Answers a question; the answer is routed to the agent waiting for it.',
  callers: ['developer'],
  input: z.object({ questionId: z.string(), answer: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const sendMessage = defineOperation({
  name: 'sendMessage',
  description: 'Writes to the assignee of a ticket role, without going through their conversation.',
  callers: ['developer'],
  input: z.object({
    key: ticketKey,
    to: role,
    body: z.string().min(1),
    attachments: z.array(z.string()).optional().describe('Ids of the ticket attachments'),
  }),
  output: z.object({ entryId: z.string() }),
});

export const listInbox = defineOperation({
  name: 'listInbox',
  description:
    'The developer answers and messages not yet delivered to this agent; each one is delivered only once.',
  callers: ['agent'],
  input: z.object({}),
  output: z.object({ items: z.array(inboxItem) }),
});

export const acknowledge = defineOperation({
  name: 'acknowledge',
  description: 'Tells the developer that their answer or message was taken into account.',
  callers: ['agent'],
  input: z.object({ entryId: z.string() }),
  output: z.object({ acknowledgedAt: z.string() }),
});

export const submitReply = defineOperation({
  name: 'submitReply',
  description:
    'Hands over the end-of-turn reply of a front agent (read by the adapter); without valid JSON, the raw text is kept.',
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
    'Tells that you start (working: true) or finish (working: false) working on the ticket; without a key, applies to the tickets of this conversation.',
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
