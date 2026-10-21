import type { Entry } from '@project-tracker/core/domain';
import type { QuestionRecord, TestRunRecord } from '@project-tracker/core/store';
import type { V1Answer, V1Project, V1Question, V1TestRun, V1Ticket } from './files';
import { partnerLabel } from './ticket';

export interface TicketJournal {
  entries: Entry[];
  questions: QuestionRecord[];
  testRuns: TestRunRecord[];
}

type EntryFields = Omit<Entry, 'id' | 'ticketId'>;

/** The journal of one ticket, in time order (ADR 0024). Entry ids keep the V1 ids: `<key>/<V1 id>`. */
export function toJournal(
  ticket: V1Ticket,
  answers: readonly V1Answer[],
  project: V1Project,
): TicketJournal {
  const key = ticket.item.id;
  const entries = [...noteEntries(ticket), ...conversationEntries(ticket, answers, project)].map(
    ([id, fields]): Entry => ({ id: `${key}/${id}`, ticketId: key, ...fields }),
  );
  return {
    entries: entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    questions: ticket.item.questions.map((question) => toQuestion(question, answers, key)),
    testRuns: ticket.testRuns.map((run) => ({
      id: `${key}/${run.id}`,
      ticketId: key,
      kind: 'auto',
      result: run.status,
      note: describeRun(run),
      at: run.at,
    })),
  };
}

/** What the agents wrote down: history, decisions, messages, notes and memory. */
function noteEntries({ item }: V1Ticket): [string, EntryFields][] {
  const note = (body: string, createdAt: string): EntryFields => ({
    entryType: 'progress',
    authorKind: 'agent',
    body,
    createdAt,
  });
  return [
    ...(item.context?.history ?? []).map((line, index): [string, EntryFields] => [
      `H${String(index + 1)}`,
      { ...note(line.text, line.at), authorKind: 'system' },
    ]),
    ...(item.context?.decisions ?? []).map((line, index): [string, EntryFields] => [
      `D${String(index + 1)}`,
      { ...note(line.text, line.at), entryType: 'decision' },
    ]),
    ...[...item.messages, ...(item.notes ?? [])].map((message): [string, EntryFields] => [
      message.id,
      note(message.body, message.at),
    ]),
    ...(item.memory ?? []).map((memory): [string, EntryFields] => [
      memory.id,
      note(memory.text, memory.at),
    ]),
  ];
}

/** What was asked, answered, exchanged and run. */
function conversationEntries(
  ticket: V1Ticket,
  answers: readonly V1Answer[],
  project: V1Project,
): [string, EntryFields][] {
  const { questions, id: key } = ticket.item;
  return [
    ...questions.map((question): [string, EntryFields] => [question.id, questionEntry(question)]),
    ...answers.map((answer): [string, EntryFields] => [
      answer.id,
      answerEntry(answer, questions, key),
    ]),
    ...ticket.exchanges.map((exchange): [string, EntryFields] => [
      exchange.id,
      {
        entryType: 'exchange',
        authorKind: 'agent',
        body: exchange.body,
        data: {
          direction: exchange.direction,
          partner: partnerLabel(exchange.partnerId, project),
          title: exchange.title,
        },
        createdAt: exchange.at,
      },
    ]),
    ...ticket.testRuns.map((run): [string, EntryFields] => [
      run.id,
      { entryType: 'testRun', authorKind: 'agent', body: describeRun(run), createdAt: run.at },
    ]),
  ];
}

function questionEntry(question: V1Question): EntryFields {
  return {
    entryType: 'question',
    authorKind: 'agent',
    body: [question.text, question.context].filter(Boolean).join('\n\n'),
    data: { type: question.type, options: (question.options ?? []).map((option) => option.label) },
    createdAt: question.askedAt,
  };
}

/** An answer to a known question replies to it; any other message of the developer is a request. */
function answerEntry(answer: V1Answer, questions: readonly V1Question[], key: string): EntryFields {
  const question = questions.find((candidate) => candidate.id === answer.questionId);
  const choice =
    question && answer.choice !== undefined ? choiceLabel(question, answer.choice) : undefined;
  const body = [choice, answer.text].filter(Boolean).join('\n\n');
  if (!question) {
    return { entryType: 'request', authorKind: 'developer', body, createdAt: answer.at };
  }
  return {
    entryType: 'answer',
    authorKind: 'developer',
    body,
    replyTo: `${key}/${question.id}`,
    createdAt: answer.at,
  };
}

function toQuestion(
  question: V1Question,
  answers: readonly V1Answer[],
  key: string,
): QuestionRecord {
  const last = answers.filter((answer) => answer.questionId === question.id).at(-1);
  const record: QuestionRecord = {
    entryId: `${key}/${question.id}`,
    ticketId: key,
    options: (question.options ?? []).map((option) => option.label),
    status: last !== undefined || question.status !== 'open' ? 'answered' : 'open',
  };
  if (question.recommended !== undefined) {
    record.recommendation = choiceLabel(question, question.recommended);
  }
  if (last !== undefined) record.answerEntryId = `${key}/${last.id}`;
  return record;
}

function choiceLabel(question: V1Question, choice: string): string {
  if (question.type === 'yesno') return choice === 'yes' ? 'Yes' : 'No';
  return question.options?.find((option) => option.id === choice)?.label ?? choice;
}

function describeRun(run: V1TestRun): string {
  const counts = [
    run.passed === undefined ? '' : `${String(run.passed)} passed`,
    run.failed === undefined ? '' : `${String(run.failed)} failed`,
    run.skipped === undefined ? '' : `${String(run.skipped)} skipped`,
  ].filter(Boolean);
  return `Tests ${run.kind} : ${run.status}${counts.length > 0 ? ` (${counts.join(', ')})` : ''}`;
}
