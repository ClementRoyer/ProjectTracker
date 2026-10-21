import type { EntryView } from '@project-tracker/contract';

export type ThreadItem =
  | {
      kind: 'message';
      id: string;
      side: 'mine' | 'other';
      tone: 'developer' | 'agent' | 'backend';
      author: string;
      initials: string;
      to: string;
      body: string;
      at: string;
      receipt: string | null;
    }
  | { kind: 'mark'; id: string; body: string; strong: boolean; at: string };

const MARKS: ReadonlySet<EntryView['entryType']> = new Set([
  'situationChange',
  'jiraImport',
  'testRun',
]);

/** The journal as a discussion: messages of each side, and marks for what happened. */
export function threadOf(entries: readonly EntryView[]): ThreadItem[] {
  return entries.map((entry) => {
    if (entry.entryType === 'decision') {
      return mark(entry, `Décision · ${entry.body}`, true);
    }
    if (MARKS.has(entry.entryType) || entry.authorKind === 'system') {
      return mark(entry, entry.body, false);
    }
    return entry.authorKind === 'developer' ? mine(entry) : theirs(entry);
  });
}

/** « F1 » for front-1, « BE » for back-end: one letter per word, then the number. */
export function initials(name: string): string {
  const words = name.split(/[-_\s]+/).filter((word) => word !== '');
  const letters = words
    .filter((word) => !/^\d+$/.test(word))
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  const number = /\d+$/.exec(name)?.[0] ?? '';
  return (letters + number).slice(0, 3);
}

function mark(entry: EntryView, body: string, strong: boolean): ThreadItem {
  return { kind: 'mark', id: entry.id, body, strong, at: entry.createdAt };
}

function mine(entry: EntryView): ThreadItem {
  return {
    kind: 'message',
    id: entry.id,
    side: 'mine',
    tone: 'developer',
    author: 'Toi',
    initials: 'MOI',
    to: recipient(entry),
    body: entry.body,
    at: entry.createdAt,
    receipt:
      entry.acknowledgedAt === null ? 'Envoyée · pas encore prise en compte' : 'Prise en compte',
  };
}

function theirs(entry: EntryView): ThreadItem {
  const fromBackend = entry.authorKind === 'launcher' || entry.role === 'backend';
  const author = entry.author ?? (fromBackend ? 'back-end' : authorKindName(entry));
  return {
    kind: 'message',
    id: entry.id,
    side: 'other',
    tone: fromBackend ? 'backend' : 'agent',
    author,
    initials: initials(author),
    to: entry.entryType === 'question' ? '→ toi' : '',
    body: entry.body,
    at: entry.createdAt,
    receipt: null,
  };
}

function recipient(entry: EntryView): string {
  if (entry.entryType === 'request' || entry.role === 'backend') return '→ back-end';
  if (entry.entryType === 'answer' || entry.role === 'front') return '→ front';
  return '';
}

function authorKindName(entry: EntryView): string {
  return entry.authorKind === 'jira' ? 'Jira' : 'agent';
}
