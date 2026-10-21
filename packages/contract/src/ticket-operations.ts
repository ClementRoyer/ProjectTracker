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

// Descriptions are read by agents and shown in the CLI help: they are in French (ADR 0006).

export const createTicket = defineOperation({
  name: 'createTicket',
  description: 'Crée un ticket local, qui ne part jamais vers Jira.',
  callers: ['developer', 'agent'],
  input: z.object({
    title: z.string().describe('Le titre, en une phrase'),
    initialRequest: z.string().optional().describe('La demande, si elle dit plus que le titre'),
  }),
  output: z.object({ key: z.string() }),
});

export const listTickets = defineOperation({
  name: 'listTickets',
  readOnly: true,
  description: 'Liste les tickets et leur situation.',
  callers: ['developer', 'agent'],
  input: z.object({ includeClosed: z.boolean().optional() }),
  output: z.object({ tickets: z.array(ticketSummary) }),
});

export const getTicket = defineOperation({
  name: 'getTicket',
  readOnly: true,
  description: 'Rend la fiche d’un ticket : demande initiale, situation et journal complet.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey }),
  output: ticketDetail,
});

export const reportProgress = defineOperation({
  name: 'reportProgress',
  description:
    'Rapporte l’avancement dans la phase courante : pas démarré, en cours (avec où on en est), fait.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, progress }),
  output: z.object({ situation }),
});

export const changePhase = defineOperation({
  name: 'changePhase',
  description:
    'Fait passer le ticket dans une autre phase ; l’avancement repart de « pas démarré ».',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, phase }),
  output: z.object({ situation }),
});

export const closeTicket = defineOperation({
  name: 'closeTicket',
  description:
    'Déclare le ticket terminé, après une validation en qualité faite. Le développeur seul.',
  callers: ['developer'],
  input: z.object({ key: ticketKey }),
  output: z.object({ situation }),
});

export const setPriority = defineOperation({
  name: 'setPriority',
  description:
    'Règle la priorité du ticket ; à fichier tenu libéré, la demande back-end du ticket le plus prioritaire passe en premier.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, priority }),
  output: z.object({ priority }),
});

export const setDueDate = defineOperation({
  name: 'setDueDate',
  description:
    'Règle l’échéance d’un ticket local (AAAA-MM-JJ), ou l’enlève avec null ; celle d’un ticket Jira vient de Jira.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, dueDate: z.iso.date().nullable() }),
  output: z.object({ dueDate: z.string().nullable() }),
});

export const setSize = defineOperation({
  name: 'setSize',
  description:
    'Estime la taille du ticket (petite, moyenne, grande), par exemple à l’analyse ; null l’enlève.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, size: size.nullable() }),
  output: z.object({ size: size.nullable() }),
});

export const setGroup = defineOperation({
  name: 'setGroup',
  description:
    'Range le ticket dans un groupe nommé (créé à la première utilisation), ou l’en sort avec null.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, group: z.string().min(1).nullable() }),
  output: z.object({ group: z.string().nullable() }),
});

export const setWorktree = defineOperation({
  name: 'setWorktree',
  description:
    'Note le dossier de travail du ticket (chemin depuis la racine du projet) et sa branche ; « tracker worktree add » le fait.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, path: z.string().min(1), branch: z.string().min(1) }),
  output: z.object({ path: z.string(), branch: z.string() }),
});

export const forgetWorktree = defineOperation({
  name: 'forgetWorktree',
  description:
    'Oublie le dossier de travail du ticket, une fois retiré ; « tracker worktree remove » le fait.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey }),
  output: z.object({}),
});

export const listWorktrees = defineOperation({
  name: 'listWorktrees',
  readOnly: true,
  description:
    'Les dossiers de travail des tickets ouverts, avec leurs branches : ce que l’aperçu réunit.',
  callers: ['developer', 'agent'],
  input: z.object({}),
  output: z.object({
    worktrees: z.array(z.object({ key: z.string(), path: z.string(), branch: z.string() })),
  }),
});

const previewConflict = z.object({
  key: z.string(),
  files: z.array(z.string()).describe('Les fichiers en conflit'),
  with: z.array(z.string()).describe('Les tickets déjà réunis qui modifient ces fichiers'),
});

export const recordPreview = defineOperation({
  name: 'recordPreview',
  description:
    'Note une reconstruction de l’aperçu : tickets réunis et tickets laissés de côté pour conflit ; « tracker preview build » le fait.',
  callers: ['developer', 'agent'],
  input: z.object({ included: z.array(z.string()), conflicts: z.array(previewConflict) }),
  output: z.object({ builtAt: z.string() }),
});

export const getPreview = defineOperation({
  name: 'getPreview',
  readOnly: true,
  description: 'La dernière reconstruction de l’aperçu, ou null s’il n’a jamais été construit.',
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
    'Les tickets à prendre ensuite, au plus trois, avec leurs raisons : échéance, priorité, presque fini, gain rapide.',
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
    'Déclare ce que le ticket attend hors de l’outil (utilisateur final, partenaire), ou lève l’attente avec null.',
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
    'Ajoute au journal un point d’avancement, une décision (avec sa raison), un retour d’utilisateur ou un échange, mot pour mot.',
  callers: ['developer', 'agent'],
  input: z.object({
    key: ticketKey,
    entryType: z.enum(['progress', 'decision', 'feedback', 'exchange']),
    body: z.string(),
    attachments: z
      .array(z.string())
      .optional()
      .describe('Identifiants de pièces jointes du ticket (tracker attach)'),
  }),
  output: z.object({ entryId: z.string() }),
});

export const recordTestRun = defineOperation({
  name: 'recordTestRun',
  description:
    'Enregistre un passage de tests du ticket : automatiques, visuels ou par l’utilisateur, réussi ou non, avec une note (par exemple « 14 sur 16 »).',
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
  description: 'Ce qui a changé depuis la dernière visite du développeur.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ since: z.string().nullable(), entries: z.array(novelty) }),
});

export const markVisited = defineOperation({
  name: 'markVisited',
  description: 'Note que le développeur a vu les nouveautés.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ at: z.string() }),
});

export const markTicketRead = defineOperation({
  name: 'markTicketRead',
  description: 'Note que le développeur a lu le ticket : son point « nouveautés » s’efface.',
  callers: ['developer'],
  input: z.object({ key: ticketKey }),
  output: z.object({ at: z.string() }),
});

export const listWaitingForMe = defineOperation({
  name: 'listWaitingForMe',
  readOnly: true,
  description:
    'Tout ce qui attend une réponse ou une action du développeur, du plus ancien au plus récent.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ items: z.array(waitingItem) }),
});

export const deliverBatch = defineOperation({
  name: 'deliverBatch',
  description:
    'Note qu’un lot de tickets est livré en qualité ; chaque ticket passe en livraison en qualité, fait.',
  callers: ['developer'],
  input: z.object({ name: z.string(), keys: z.array(ticketKey).min(1) }),
  output: deliveryBatch.extend({
    changelog: z
      .object({ written: z.number(), missing: z.array(z.string()) })
      .nullable()
      .describe('Ce que la livraison a ajouté au changelog ; null sans changelog'),
  }),
});

export const validateBatch = defineOperation({
  name: 'validateBatch',
  description:
    'Note que la livraison est validée en qualité ; chaque ticket passe en validation en qualité, faite.',
  callers: ['developer'],
  input: z.object({ batchId: z.string() }),
  output: deliveryBatch,
});

export const proposeChangelog = defineOperation({
  name: 'proposeChangelog',
  description:
    'Propose la ligne de changelog du ticket, en une phrase pour l’utilisateur final ; le développeur la relira avant la livraison.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, line: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const acceptChangelog = defineOperation({
  name: 'acceptChangelog',
  description: 'Accepte, éventuellement reformulée, la ligne de changelog du ticket.',
  callers: ['developer'],
  input: z.object({ key: ticketKey, line: z.string().min(1) }),
  output: z.object({ entryId: z.string() }),
});

export const listBatches = defineOperation({
  name: 'listBatches',
  readOnly: true,
  description: 'Liste les livraisons en qualité, la plus récente d’abord.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({ batches: z.array(deliveryBatch) }),
});

export const reportChangedFiles = defineOperation({
  name: 'reportChangedFiles',
  description:
    'Rapporte les fichiers que le ticket modifie (relevés par la CLI) ; rend les autres tickets qui touchent les mêmes fichiers.',
  callers: ['developer', 'agent'],
  input: z.object({ key: ticketKey, files: z.array(z.string()) }),
  output: z.object({
    overlaps: z.array(z.object({ path: z.string(), keys: z.array(z.string()) })),
  }),
});

export const loadFromJira = defineOperation({
  name: 'loadFromJira',
  description:
    'Charge de Jira les tickets assignés au développeur sur le projet : crée les nouveaux, note ce qui a changé. Rien n’est écrit dans Jira.',
  callers: ['developer'],
  input: z.object({}),
  output: z.object({
    read: z.number(),
    created: z.array(z.string()),
    changed: z.array(z.string()),
    notAssigned: z.array(z.string()),
  }),
});

export const listDocuments = defineOperation({
  name: 'listDocuments',
  readOnly: true,
  description:
    'Les documents de référence du projet (chemins depuis sa racine), à lire avant de travailler.',
  callers: ['developer', 'agent'],
  input: z.object({}),
  output: z.object({ documents: z.array(z.object({ path: z.string() })) }),
});

export const readDocument = defineOperation({
  name: 'readDocument',
  readOnly: true,
  description: 'Rend le texte d’un document de référence du projet.',
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
  listDocuments,
  readDocument,
] as const;
