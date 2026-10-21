import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import {
  appendEntry,
  inTransaction,
  insertAttachment,
  insertDeliveryBatch,
  insertQuestion,
  insertTestRun,
  insertTicket,
  insertUsage,
  openDatabase,
  saveSituation,
} from '@project-tracker/core/store';
import { readV1Project, type V1Project, type V1Ticket } from './files';
import { toJournal } from './journal';
import { toAttachments, toDeliveryBatch, toUsage } from './project-records';
import { toSituation, toTicket } from './ticket';

export interface MigrationRequest {
  trackerFolder: string;
  projectId: string;
  database: string;
}

export interface MigrationReport {
  tickets: number;
  entries: number;
  attachments: number;
  deliveryBatches: number;
  usage: number;
  /** What was left out on purpose (ADR 0024), by reason. */
  skipped: { task: number };
}

/** Writes a new V2 database from a V1 schema 4 project, all or nothing; V1 stays untouched. */
export function migrateV1Project(request: MigrationRequest): MigrationReport {
  if (existsSync(request.database)) {
    throw new Error(`The database already exists, it is never overwritten: ${request.database}`);
  }
  const project = readV1Project(request.trackerFolder, request.projectId);
  const folder = dirname(request.database);
  const attachmentsExisted = existsSync(join(folder, 'attachments'));
  mkdirSync(folder, { recursive: true });
  const db = openDatabase(request.database);
  try {
    const report = inTransaction(db, () => writeProject(db, project, folder));
    db.close();
    return report;
  } catch (error) {
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(`${request.database}${suffix}`, { force: true });
    }
    if (!attachmentsExisted) rmSync(join(folder, 'attachments'), { recursive: true, force: true });
    throw error;
  }
}

function writeProject(
  db: DatabaseSync,
  project: V1Project,
  databaseFolder: string,
): MigrationReport {
  const cards = project.tickets.filter((ticket) => ticket.item.kind !== 'task');
  const ticketIds = new Set(cards.map((ticket) => ticket.item.id));
  const report: MigrationReport = {
    tickets: cards.length,
    entries: 0,
    attachments: 0,
    deliveryBatches: project.lots.length,
    usage: 0,
    skipped: { task: project.tickets.length - cards.length },
  };
  for (const ticket of cards) {
    const written = writeTicket(db, ticket, project, databaseFolder);
    report.entries += written.entries;
    report.attachments += written.attachments;
  }
  for (const lot of project.lots) insertDeliveryBatch(db, toDeliveryBatch(lot, ticketIds));
  for (const usage of project.usage.flatMap((line) => toUsage(line, ticketIds))) {
    insertUsage(db, usage);
    report.usage += 1;
  }
  return report;
}

function writeTicket(
  db: DatabaseSync,
  ticket: V1Ticket,
  project: V1Project,
  databaseFolder: string,
): { entries: number; attachments: number } {
  insertTicket(db, toTicket(ticket.item, project));
  saveSituation(db, toSituation(ticket.item, project));
  const answers = project.answers.filter((answer) => answer.itemId === ticket.item.id);
  const journal = toJournal(ticket, answers, project);
  for (const entry of journal.entries) appendEntry(db, entry);
  for (const question of journal.questions) insertQuestion(db, question);
  for (const run of journal.testRuns) insertTestRun(db, run);
  const attachments = toAttachments(ticket);
  for (const { source, ...attachment } of attachments) {
    const target = join(databaseFolder, attachment.path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    insertAttachment(db, attachment);
  }
  return { entries: journal.entries.length, attachments: attachments.length };
}
