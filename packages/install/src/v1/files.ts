import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// V1 schema 4, as described in legacy/references/state-format.md. Only the fields the migration reads.

const dated = z.object({ at: z.string(), text: z.string() });

const question = z.object({
  id: z.string(),
  type: z.enum(['yesno', 'choice', 'open']),
  status: z.enum(['open', 'closed', 'superseded']),
  text: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  context: z.string().optional(),
  recommended: z.string().optional(),
  askedAt: z.string(),
});

const message = z.object({ id: z.string(), at: z.string(), body: z.string() });

const attachment = z.object({ id: z.string(), file: z.string(), type: z.string(), at: z.string() });

const item = z.object({
  id: z.string(),
  kind: z.enum(['ticket', 'topic', 'task']),
  title: z.string(),
  priority: z.string().optional(),
  stage: z.string().optional(),
  doneAt: z.string().optional(),
  blockedBy: z.string().optional(),
  waitingSince: z.string().optional(),
  context: z
    .object({
      request: z.string().optional(),
      origin: z.string().optional(),
      history: z.array(dated).optional(),
      decisions: z.array(dated).optional(),
    })
    .optional(),
  questions: z.array(question),
  messages: z.array(message),
  notes: z.array(message).optional(),
  memory: z.array(dated.extend({ id: z.string() })).optional(),
  attachments: z.array(attachment),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const project = z.object({
  schemaVersion: z.number(),
  lots: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      title: z.string(),
      itemIds: z.array(z.string()).optional(),
    }),
  ),
});

const answerLine = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('answer'),
    id: z.string(),
    at: z.string(),
    itemId: z.string().nullable(),
    questionId: z.string().nullable(),
    choice: z.string().optional(),
    text: z.string(),
  }),
  z.object({ type: z.literal('retract'), answerId: z.string() }),
  z.object({ type: z.literal('status') }),
]);

const exchangeLine = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exchange'),
    id: z.string(),
    at: z.string(),
    direction: z.enum(['sent', 'received']),
    partnerId: z.string(),
    title: z.string(),
    body: z.string(),
  }),
  z.object({ type: z.literal('ref') }),
]);

const testRunLine = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run'),
    id: z.string(),
    kind: z.string(),
    at: z.string(),
    status: z.enum(['passed', 'failed', 'error']),
    passed: z.number().optional(),
    failed: z.number().optional(),
    skipped: z.number().optional(),
  }),
  z.object({ type: z.literal('removal'), runId: z.string() }),
]);

const usageLine = z.object({
  type: z.literal('usage'),
  id: z.string(),
  at: z.string(),
  items: z.array(z.string()),
  projectId: z.string().nullable(),
  attribution: z.enum(['held', 'window', 'shared', 'none']),
  models: z.array(
    z.object({
      model: z.string(),
      input: z.number(),
      output: z.number(),
      cacheRead: z.number(),
      cacheWrite5m: z.number(),
      cacheWrite1h: z.number(),
    }),
  ),
});

const config = z.object({
  stages: z.array(z.object({ id: z.string(), role: z.string() })).optional(),
  projects: z.array(
    z.object({
      id: z.string(),
      stages: z.array(z.object({ id: z.string(), role: z.string() })).optional(),
      issueTracker: z.object({ type: z.string(), keyPattern: z.string().optional() }).optional(),
      partners: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
    }),
  ),
});

export type V1Item = z.infer<typeof item>;
export type V1Question = z.infer<typeof question>;
export type V1Answer = Extract<z.infer<typeof answerLine>, { type: 'answer' }>;
export type V1Exchange = Extract<z.infer<typeof exchangeLine>, { type: 'exchange' }>;
export type V1TestRun = Extract<z.infer<typeof testRunLine>, { type: 'run' }>;
export type V1Usage = z.infer<typeof usageLine>;
export type V1ProjectConfig = z.infer<typeof config>['projects'][number];
export type V1Lot = z.infer<typeof project>['lots'][number];

export interface V1Ticket {
  item: V1Item;
  exchanges: V1Exchange[];
  testRuns: V1TestRun[];
  folder: string;
}

/** Everything the migration reads from one V1 project, validated. */
export interface V1Project {
  config: V1ProjectConfig;
  stageRoles: ReadonlyMap<string, string>;
  lots: V1Lot[];
  tickets: V1Ticket[];
  answers: V1Answer[];
  usage: V1Usage[];
}

const DEFAULT_STAGES = ['todo', 'doing', 'deliver', 'test', 'done'].map((id) => ({ id, role: id }));

export function readV1Project(trackerFolder: string, projectId: string): V1Project {
  const trackerConfig = config.parse(readJson(join(trackerFolder, 'tracker.config.json')));
  const projectConfig = trackerConfig.projects.find((candidate) => candidate.id === projectId);
  if (!projectConfig) throw new Error(`V1 project not found in tracker.config.json: ${projectId}`);
  const folder = join(trackerFolder, 'projects', projectId);
  const projectFile = project.parse(readJson(join(folder, 'project.json')));
  if (projectFile.schemaVersion !== 4) {
    throw new Error(
      `V1 project ${projectId} is in schema ${String(projectFile.schemaVersion)}: run the V1 upgrade to schema 4 first.`,
    );
  }
  const stages = projectConfig.stages ?? trackerConfig.stages ?? DEFAULT_STAGES;
  return {
    config: projectConfig,
    stageRoles: new Map(stages.map((stage) => [stage.id, stage.role])),
    lots: projectFile.lots,
    tickets: readTickets(join(folder, 'tickets')),
    answers: readAnswers(join(folder, 'answers.jsonl')),
    usage: readLines(join(trackerFolder, 'usage.jsonl'), usageLine).filter(
      (line) => line.projectId === projectId,
    ),
  };
}

/** The answers, without those the developer retracted. */
function readAnswers(path: string): V1Answer[] {
  const lines = readLines(path, answerLine);
  const retracted = new Set(
    lines.flatMap((line) => (line.type === 'retract' ? [line.answerId] : [])),
  );
  return lines.filter(
    (line): line is V1Answer => line.type === 'answer' && !retracted.has(line.id),
  );
}

function readTickets(ticketsFolder: string): V1Ticket[] {
  return readdirSync(ticketsFolder, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(ticketsFolder, entry.name, 'item.json')),
    )
    .map((entry) => {
      const folder = join(ticketsFolder, entry.name);
      const runs = readLines(join(folder, 'test-runs.jsonl'), testRunLine);
      const removed = new Set(
        runs.flatMap((line) => (line.type === 'removal' ? [line.runId] : [])),
      );
      return {
        item: item.parse(readJson(join(folder, 'item.json'))),
        exchanges: readLines(join(folder, 'exchanges.jsonl'), exchangeLine).filter(
          (line): line is V1Exchange => line.type === 'exchange',
        ),
        testRuns: runs.filter(
          (line): line is V1TestRun => line.type === 'run' && !removed.has(line.id),
        ),
        folder,
      };
    });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readLines<T>(path: string, schema: z.ZodType<T>): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => schema.parse(JSON.parse(line)));
}
