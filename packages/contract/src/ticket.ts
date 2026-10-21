import { z } from 'zod';

// Shapes exchanged on the wire. Absent values are `null`, never missing keys.

export const phase = z.enum([
  'todo',
  'analysis',
  'development',
  'test',
  'qaDelivery',
  'qaValidation',
]);

export const progress = z.discriminatedUnion('state', [
  z.object({ state: z.literal('notStarted') }),
  z.object({ state: z.literal('inProgress'), note: z.string() }),
  z.object({ state: z.literal('done') }),
]);

export const wait = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('developer'), since: z.string() }),
  z.object({ kind: z.literal('backend'), since: z.string() }),
  z.object({ kind: z.literal('resource'), since: z.string(), detail: z.string() }),
  z.object({ kind: z.literal('fileHold'), since: z.string(), detail: z.string() }),
  z.object({ kind: z.literal('endUser'), since: z.string(), detail: z.string() }),
  z.object({ kind: z.literal('partner'), since: z.string(), detail: z.string() }),
]);

export const situation = z.object({
  phase,
  progress,
  wait: wait.nullable(),
  closedAt: z.string().nullable(),
});

export const priority = z
  .enum(['urgent', 'high', 'normal', 'low'])
  .describe('Ticket priority, set by the developer: urgent, high, normal, low');

export const size = z
  .enum(['small', 'medium', 'large'])
  .describe('Estimated ticket size: small, medium, large');

export const ticketKey = z.string().min(1).describe('Ticket key, for example PROJ-12 or LOC-3');

export const role = z.enum(['front', 'backend']);

export const assignee = z.object({
  role,
  kind: z.enum(['developer', 'agent']),
  name: z.string().nullable().describe('The agent name; null for the developer'),
});

export const ticketSummary = z.object({
  key: z.string(),
  title: z.string(),
  origin: z.enum(['jira', 'local']),
  priority,
  dueDate: z.string().nullable().describe('Due date, YYYY-MM-DD'),
  group: z.string().nullable().describe('The ticket group (a feature, an epic...)'),
  size: size.nullable(),
  jiraStatus: z.string().nullable(),
  situation,
  lastActivityAt: z.string(),
  stale: z.boolean(),
  unread: z.boolean(),
  overlaps: z.array(z.string()).describe('The other open tickets that change the same files'),
  assignees: z.array(assignee),
  working: z.boolean().describe('An agent is working on the ticket (reported, otherwise inferred)'),
  readyToClose: z.boolean().describe('QA validation done: the developer can close it'),
});

export const entry = z.object({
  id: z.string(),
  entryType: z.enum([
    'progress',
    'decision',
    'exchange',
    'feedback',
    'question',
    'answer',
    'request',
    'situationChange',
    'testRun',
    'jiraImport',
  ]),
  authorKind: z.enum(['developer', 'agent', 'jira', 'launcher', 'system']),
  author: z.string().nullable().describe('Agent name, when an agent wrote it'),
  role: role.nullable(),
  body: z.string(),
  data: z.unknown(),
  replyTo: z.string().nullable(),
  acknowledgedAt: z
    .string()
    .nullable()
    .describe('When the assignee took this developer message into account'),
  createdAt: z.string(),
});

export const attachment = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.string().nullable(),
  path: z.string().describe('File path on the tracker machine'),
  url: z.string().describe('URL to read it, with a token (GET)'),
  createdAt: z.string(),
});

/** What the developer needs to answer a question without reading the whole journal. */
export const questionDetails = z.object({
  context: z.string().nullable(),
  options: z.array(z.string()),
  recommendation: z.string().nullable(),
  author: z.string().nullable(),
  role: role.nullable(),
});

export const openQuestion = questionDetails.extend({
  questionId: z.string(),
  text: z.string(),
  askedAt: z.string(),
});

export const ticketDetail = ticketSummary.extend({
  initialRequest: z.string().nullable(),
  jiraUrl: z.string().nullable(),
  entries: z.array(entry),
  openQuestions: z.array(openQuestion),
  attachments: z.array(attachment),
  changelog: z
    .object({ proposed: z.string().nullable(), accepted: z.string().nullable() })
    .nullable()
    .describe('The ticket changelog line; null when the project has no changelog'),
  worktree: z
    .object({ path: z.string(), branch: z.string() })
    .nullable()
    .describe('The ticket working folder, path from the project root; null without a folder'),
  preview: z
    .object({
      state: z.enum(['included', 'conflict']),
      files: z.array(z.string()).describe('The conflicting files'),
      with: z.array(z.string()).describe('The tickets already merged that change them'),
    })
    .nullable()
    .describe('The ticket in the last preview rebuild; null if it was not in it'),
  changedFiles: z
    .array(
      z.object({
        path: z.string(),
        repo: z.string().nullable().describe('The file repository, when the project names some'),
        sharedWith: z.array(z.string()),
      }),
    )
    .describe('The files the ticket changes, and the other open tickets that change them too'),
});

export const novelty = entry.extend({ key: z.string(), title: z.string() });

export const waitingItem = z.object({
  kind: z.enum(['question', 'close']),
  questionId: z.string().nullable().describe('For a question: the id to give to answerQuestion'),
  key: z.string(),
  title: z.string(),
  since: z.string(),
  text: z.string(),
  question: questionDetails.nullable(),
});

export const deliveryBatch = z.object({
  id: z.string(),
  name: z.string(),
  deliveredAt: z.string().nullable(),
  validatedAt: z.string().nullable(),
  keys: z.array(z.string()),
});

/** One project of the machine's registry (ADR 0039), written by the install, read by the server. */
export const registryEntry = z.object({ name: z.string(), url: z.string(), root: z.string() });

export type SituationView = z.infer<typeof situation>;
export type TicketSummary = z.infer<typeof ticketSummary>;
export type TicketDetail = z.infer<typeof ticketDetail>;
export type EntryView = z.infer<typeof entry>;
export type Novelty = z.infer<typeof novelty>;
export type WaitingItem = z.infer<typeof waitingItem>;
export type OpenQuestionView = z.infer<typeof openQuestion>;
export type QuestionDetails = z.infer<typeof questionDetails>;
export type AttachmentView = z.infer<typeof attachment>;
export type DeliveryBatchView = z.infer<typeof deliveryBatch>;
