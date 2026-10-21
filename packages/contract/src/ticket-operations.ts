import { z } from 'zod';
import { defineOperation } from './operation';
import {
  deliveryBatch,
  novelty,
  phase,
  priority,
  progress,
  size,
  situation,
  ticketDetail,
  ticketKey,
  ticketSummary,
  waitingItem,
} from './ticket';

// Descriptions are read by agents and shown in the CLI help: they are in English (ADR 0053).

export const createTicket = defineOperation({
  name: 'createTicket',
  description: 'Creates a local ticket, which never goes to Jira.',
  callers: ['developer', 'agent'],
  input: z.object({
    title: z.string().describe('The title, in one sentence'),
    initialRequest: z.string().optional().describe('The request, if it says more than the title'),
  }),
  output: z.object({ key: z.string() }),
});

export const listTickets = defineOperation({
  name: 'listTickets',
  readOnly: true,
  description: 'Lists the tickets and their situation.',
  callers: ['developer', 'agent'],
  input: z.object({ includeClosed: z.boolean().optional() }),
  output: z.object({ tickets: z.array(ticketSummary) }),
});

export const getTicket = defineOperation({
  name: 'getTicket',
  readOnly: true,
  description: 'Returns the sheet of a ticket: initial request, situation and full journal.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey }),
  output: ticketDetail,
});

export const reportProgress = defineOperation({
  name: 'reportProgress',
  description:
    'Reports progress in the current phase: not started, in progress (with where things stand), done.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, progress }),
  output: z.object({ situation }),
});

export const changePhase = defineOperation({
  name: 'changePhase',
  description: 'Moves the ticket to another phase; progress restarts at "not started".',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, phase }),
  output: z.object({ situation }),
});

export const closeTicket = defineOperation({
  name: 'closeTicket',
  description: 'Declares the ticket closed, after QA validation is done. The developer only.',
  callers: ['developer'],
  input: z.object({ key: ticketKey }),
  output: z.object({ situation }),
});

export const setPriority = defineOperation({
  name: 'setPriority',
  description:
    'Sets the ticket priority; when a held file is released, the back-end request of the highest-priority ticket goes first.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, priority }),
  output: z.object({ priority }),
});

export const setDueDate = defineOperation({
  name: 'setDueDate',
  description:
    'Sets the due date of a local ticket (YYYY-MM-DD), or removes it with null; a Jira ticket due date comes from Jira.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, dueDate: z.iso.date().nullable() }),
  output: z.object({ dueDate: z.string().nullable() }),
});

export const setSize = defineOperation({
  name: 'setSize',
  description:
    'Estimates the ticket size (small, medium, large), for example during analysis; null removes it.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, size: size.nullable() }),
  output: z.object({ size: size.nullable() }),
});

export const setGroup = defineOperation({
  name: 'setGroup',
  description:
    'Puts the ticket in a named group (created on first use), or takes it out with null.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, group: z.string().min(1).nullable() }),
  output: z.object({ group: z.string().nullable() }),
});

export const setWorktree = defineOperation({
  name: 'setWorktree',
  description:
    'Records the ticket working folder (path from the project root) and its branch; "tracker worktree add" does it.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, path: z.string().min(1), branch: z.string().min(1) }),
  output: z.object({ path: z.string(), branch: z.string() }),
});

export const forgetWorktree = defineOperation({
  name: 'forgetWorktree',
  description:
    'Forgets the ticket working folder, once removed; "tracker worktree remove" does it.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey }),
  output: z.object({}),
});

export const listWorktrees = defineOperation({
  name: 'listWorktrees',
  readOnly: true,
  description:
    'The working folders of the open tickets, with their branches: what the preview merges.',
  callers: ['developer', 'agent'],
  input: z.object({}),
  output: z.object({
    worktrees: z.array(z.object({ key: z.string(), path: z.string(), branch: z.string() })),
  }),
});

const previewConflict = z.object({
  key: z.string(),
  files: z.array(z.string()).describe('The conflicting files'),
  with: z.array(z.string()).describe('The tickets already merged that change these files'),
});

export const recordPreview = defineOperation({
  name: 'recordPreview',
  description:
    'Records a preview rebuild: tickets merged and tickets left out because of a conflict; "tracker preview build" does it.',
  callers: ['developer', 'agent'],
  input: z.object({ included: z.array(z.string()), conflicts: z.array(previewConflict) }),
  output: z.object({ builtAt: z.string() }),
});

export const getPreview = defineOperation({
  name: 'getPreview',
  readOnly: true,
  description: 'The last preview rebuild, or null if it was never built.',
  callers: ['developer', 'agent'],
  input: z.object({}),
  output: z.object({
    preview: z
      .object({
        builtAt: z.string(),
        included: z.array(z.string()),
        conflicts: z.array(previewConflict),
      })
      .nullable(),
  }),
});

export const suggestNext = defineOperation({
  name: 'suggestNext',
  readOnly: true,
  description:
    'The tickets to take next, at most three, with their reasons: due date, priority, almost done, quick win.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({
    suggestions: z.array(
      z.object({ key: z.string(), title: z.string(), reasons: z.array(z.string()) }),
    ),
  }),
});

export const declareWait = defineOperation({
  name: 'declareWait',
  description:
    'Declares what the ticket waits for outside the tool (end user, partner), or clears the wait with null.',
  callers: ['developer', 'agent'],
  input: z.object({
    key: ticketKey,
    wait: z.object({ kind: z.enum(['endUser', 'partner']), detail: z.string() }).nullable(),
  }),
  output: z.object({ situation }),
});

export const recordEntry = defineOperation({
  name: 'recordEntry',
  description:
    'Adds to the journal a progress update, a decision (with its reason), end-user feedback or an exchange, word for word.',
  callers: ['developer', 'agent'],
  input: z.object({
    key: ticketKey,
    entryType: z.enum(['progress', 'decision', 'feedback', 'exchange']),
    body: z.string(),
    attachments: z
      .array(z.string())
      .optional()
      .describe('Ids of the ticket attachments (tracker attach)'),
  }),
  output: z.object({ entryId: z.string() }),
});

export const recordTestRun = defineOperation({
  name: 'recordTestRun',
  description:
    'Records a test run of the ticket: automatic, visual or by the user, passed or not, with a note (for example "14 of 16").',
  callers: ['developer', 'agent'],
  input: z.object({
    key: ticketKey,
    kind: z.enum(['auto', 'visual', 'user']),
    passed: z.boolean(),
    note: z.string().optional(),
  }),
  output: z.object({ entryId: z.string() }),
});

export const listNovelties = defineOperation({
  name: 'listNovelties',
  readOnly: true,
  description: 'What has changed since the last visit of the developer.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ since: z.string().nullable(), entries: z.array(novelty) }),
});

export const markVisited = defineOperation({
  name: 'markVisited',
  description: 'Records that the developer has seen the updates.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ at: z.string() }),
});

export const markTicketRead = defineOperation({
  name: 'markTicketRead',
  description: 'Records that the developer has read the ticket: its "updates" marker disappears.',
  callers: ['developer'],
  input: z.object({ key: ticketKey }),
  output: z.object({ at: z.string() }),
});

export const listWaitingForMe = defineOperation({
  name: 'listWaitingForMe',
  readOnly: true,
  description:
    'Everything waiting for an answer or an action from the developer, from the oldest to the newest.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ items: z.array(waitingItem) }),
});

export const deliverBatch = defineOperation({
  name: 'deliverBatch',
  description:
    'Records that a set of tickets is delivered to QA; each ticket moves to QA delivery, done.',
  callers: ['developer'],
  input: z.object({ name: z.string(), keys: z.array(ticketKey).min(1) }),
  output: deliveryBatch.extend({
    changelog: z
      .object({ written: z.number(), missing: z.array(z.string()) })
      .nullable()
      .describe('What the delivery added to the changelog; null without a changelog'),
  }),
});

export const validateBatch = defineOperation({
  name: 'validateBatch',
  description:
    'Records that the delivery is validated in QA; each ticket moves to QA validation, done.',
  callers: ['developer'],
  input: z.object({ batchId: z.string() }),
  output: deliveryBatch,
});

export const proposeChangelog = defineOperation({
  name: 'proposeChangelog',
  description:
    'Proposes the ticket changelog line, in one sentence for the end user; the developer will review it before the delivery.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, line: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const acceptChangelog = defineOperation({
  name: 'acceptChangelog',
  description: 'Accepts the ticket changelog line, possibly reworded.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, line: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const listBatches = defineOperation({
  name: 'listBatches',
  readOnly: true,
  description: 'Lists the QA deliveries, the most recent first.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ batches: z.array(deliveryBatch) }),
});

export const reportChangedFiles = defineOperation({
  name: 'reportChangedFiles',
  description:
    'Reports the files the ticket changes (collected by the CLI); returns the other tickets that touch the same files.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, files: z.array(z.string()) }),
  output: z.object({
    overlaps: z.array(z.object({ path: z.string(), keys: z.array(z.string()) })),
  }),
});

export const loadFromJira = defineOperation({
  name: 'loadFromJira',
  description:
    'Loads from Jira the tickets assigned to the developer on the project: creates the new ones, records what changed. Nothing is written to Jira.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({
    read: z.number(),
    created: z.array(z.string()),
    changed: z.array(z.string()),
    notAssigned: z.array(z.string()),
  }),
});

export const previewJiraLoad = defineOperation({
  name: 'previewJiraLoad',
  readOnly: true,
  description:
    'Counts what a Jira import would bring (tickets read, new ones), without writing anything to Jira or to the tracker.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ read: z.number(), created: z.array(z.string()) }),
});

export const listDocuments = defineOperation({
  name: 'listDocuments',
  readOnly: true,
  description:
    'The reference documents of the project (paths from its root), to read before working.',
  callers: ['developer', 'agent'],
  input: z.object({}),
  output: z.object({ documents: z.array(z.object({ path: z.string() })) }),
});

export const readDocument = defineOperation({
  name: 'readDocument',
  readOnly: true,
  description: 'Returns the text of a reference document of the project.',
  callers: ['developer', 'agent'],
  input: z.object({ path: z.string() }),
  output: z.object({ path: z.string(), content: z.string() }),
});

export const ticketOperations = [
  createTicket,
  listTickets,
  getTicket,
  reportProgress,
  changePhase,
  closeTicket,
  setPriority,
  setDueDate,
  setSize,
  setGroup,
  setWorktree,
  forgetWorktree,
  listWorktrees,
  recordPreview,
  getPreview,
  suggestNext,
  declareWait,
  recordEntry,
  recordTestRun,
  listNovelties,
  markVisited,
  markTicketRead,
  listWaitingForMe,
  deliverBatch,
  validateBatch,
  listBatches,
  proposeChangelog,
  acceptChangelog,
  reportChangedFiles,
  loadFromJira,
  previewJiraLoad,
  listDocuments,
  readDocument,
] as const;
