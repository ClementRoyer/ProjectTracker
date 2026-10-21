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
  .describe('Priorité du ticket, réglée par le développeur : urgente, haute, normale, basse');

export const size = z
  .enum(['small', 'medium', 'large'])
  .describe('Taille estimée du ticket : petite, moyenne, grande');

export const ticketKey = z.string().min(1).describe('Clé du ticket, par exemple PROJ-12 ou LOC-3');

export const role = z.enum(['front', 'backend']);

export const assignee = z.object({
  role,
  kind: z.enum(['developer', 'agent']),
  name: z.string().nullable().describe('Le nom de l’agent ; null pour le développeur'),
});

export const ticketSummary = z.object({
  key: z.string(),
  title: z.string(),
  origin: z.enum(['jira', 'local']),
  priority,
  dueDate: z.string().nullable().describe('Échéance, AAAA-MM-JJ'),
  group: z.string().nullable().describe('Le groupe du ticket (une fonctionnalité, une épopée…)'),
  size: size.nullable(),
  jiraStatus: z.string().nullable(),
  situation,
  lastActivityAt: z.string(),
  stale: z.boolean(),
  unread: z.boolean(),
  overlaps: z
    .array(z.string())
    .describe('Les autres tickets ouverts qui modifient les mêmes fichiers'),
  assignees: z.array(assignee),
  working: z.boolean().describe('Un agent travaille sur le ticket (signalé, sinon déduit)'),
  readyToClose: z.boolean().describe('Validation en qualité faite : le développeur peut le clore'),
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
  author: z.string().nullable().describe('Nom de l’agent, quand un agent a écrit'),
  role: role.nullable(),
  body: z.string(),
  data: z.unknown(),
  replyTo: z.string().nullable(),
  acknowledgedAt: z
    .string()
    .nullable()
    .describe('Quand l’intervenant a pris en compte ce message du développeur'),
  createdAt: z.string(),
});

export const attachment = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.string().nullable(),
  path: z.string().describe('Chemin du fichier sur la machine du tracker'),
  url: z.string().describe('Adresse pour le lire, avec un jeton (GET)'),
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
    .describe('La ligne de changelog du ticket ; null quand le projet n’a pas de changelog'),
  worktree: z
    .object({ path: z.string(), branch: z.string() })
    .nullable()
    .describe(
      'Le dossier de travail du ticket, chemin depuis la racine du projet ; null sans dossier',
    ),
  preview: z
    .object({
      state: z.enum(['included', 'conflict']),
      files: z.array(z.string()).describe('Les fichiers en conflit'),
      with: z.array(z.string()).describe('Les tickets déjà réunis qui les modifient'),
    })
    .nullable()
    .describe('Le ticket dans la dernière reconstruction de l’aperçu ; null s’il n’y était pas'),
  changedFiles: z
    .array(
      z.object({
        path: z.string(),
        repo: z.string().nullable().describe('Le dépôt du fichier, quand le projet en nomme'),
        sharedWith: z.array(z.string()),
      }),
    )
    .describe(
      'Les fichiers que le ticket modifie, et les autres tickets ouverts qui les modifient aussi',
    ),
});

export const novelty = entry.extend({ key: z.string(), title: z.string() });

export const waitingItem = z.object({
  kind: z.enum(['question', 'close']),
  questionId: z
    .string()
    .nullable()
    .describe('Pour une question : l’identifiant à donner à answerQuestion'),
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
