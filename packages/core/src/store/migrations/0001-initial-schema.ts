/** The data model of ADR 0015. Names come from the glossary; instants are ISO 8601 UTC text. */
export const initialSchema = `
CREATE TABLE "group" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ticket (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL CHECK (origin IN ('jira', 'local')),
  title TEXT NOT NULL,
  initialRequest TEXT,
  jiraUrl TEXT,
  jiraStatus TEXT,
  groupId TEXT REFERENCES "group" (id),
  createdAt TEXT NOT NULL,
  closedAt TEXT
);

CREATE TABLE situation (
  ticketId TEXT PRIMARY KEY REFERENCES ticket (id),
  phase TEXT NOT NULL
    CHECK (phase IN ('todo', 'analysis', 'development', 'test', 'qaDelivery', 'qaValidation')),
  progress TEXT NOT NULL CHECK (progress IN ('notStarted', 'inProgress', 'done')),
  progressNote TEXT,
  waitKind TEXT
    CHECK (waitKind IN ('developer', 'backend', 'resource', 'fileHold', 'endUser', 'partner')),
  waitSince TEXT,
  waitDetail TEXT,
  updatedAt TEXT NOT NULL
);

CREATE TABLE agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tool TEXT
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  agentId TEXT NOT NULL REFERENCES agent (id),
  tokenHash TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  lastSeenAt TEXT NOT NULL,
  endedAt TEXT
);

CREATE TABLE entry (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  entryType TEXT NOT NULL CHECK (
    entryType IN (
      'progress', 'decision', 'exchange', 'feedback', 'question',
      'answer', 'request', 'situationChange', 'testRun', 'jiraImport'
    )
  ),
  authorKind TEXT NOT NULL
    CHECK (authorKind IN ('developer', 'agent', 'jira', 'launcher', 'system')),
  sessionId TEXT REFERENCES session (id),
  role TEXT CHECK (role IN ('front', 'backend')),
  body TEXT NOT NULL,
  data TEXT,
  replyTo TEXT REFERENCES entry (id),
  createdAt TEXT NOT NULL
);
CREATE INDEX entryByTicket ON entry (ticketId, createdAt);
CREATE INDEX entryByDate ON entry (createdAt);

CREATE TRIGGER entryIsImmutableOnUpdate BEFORE UPDATE ON entry
BEGIN
  SELECT RAISE(ABORT, 'journal entries are immutable');
END;
CREATE TRIGGER entryIsImmutableOnDelete BEFORE DELETE ON entry
BEGIN
  SELECT RAISE(ABORT, 'journal entries are immutable');
END;

CREATE TABLE assignment (
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  role TEXT NOT NULL CHECK (role IN ('front', 'backend')),
  assigneeKind TEXT NOT NULL CHECK (assigneeKind IN ('developer', 'agent')),
  agentId TEXT REFERENCES agent (id),
  sessionId TEXT REFERENCES session (id),
  since TEXT NOT NULL,
  releasedAt TEXT,
  CHECK ((assigneeKind = 'agent') = (agentId IS NOT NULL))
);
CREATE UNIQUE INDEX oneActiveAssigneePerRole ON assignment (ticketId, role)
  WHERE releasedAt IS NULL;

CREATE TABLE question (
  entryId TEXT PRIMARY KEY REFERENCES entry (id),
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  options TEXT,
  recommendation TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'answered')),
  answerEntryId TEXT REFERENCES entry (id)
);

CREATE TABLE delivery (
  entryId TEXT NOT NULL REFERENCES entry (id),
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  role TEXT NOT NULL CHECK (role IN ('front', 'backend')),
  sessionId TEXT REFERENCES session (id),
  deliveredAt TEXT,
  acknowledgedAt TEXT,
  PRIMARY KEY (entryId, role)
);

CREATE TABLE launcher (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tokenHash TEXT NOT NULL,
  lastSeenAt TEXT,
  heldFiles TEXT
);

CREATE TABLE backendRequest (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  entryId TEXT NOT NULL REFERENCES entry (id),
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'taken', 'running', 'done', 'failed', 'unreachable')),
  createdAt TEXT NOT NULL
);

CREATE TABLE execution (
  id TEXT PRIMARY KEY,
  requestId TEXT NOT NULL REFERENCES backendRequest (id),
  launcherId TEXT NOT NULL REFERENCES launcher (id),
  startedAt TEXT NOT NULL,
  endedAt TEXT,
  outcome TEXT,
  undeclaredChanges TEXT
);

CREATE TABLE worktree (
  ticketId TEXT PRIMARY KEY REFERENCES ticket (id),
  path TEXT NOT NULL,
  branch TEXT NOT NULL,
  lastReportAt TEXT
);

CREATE TABLE changedFile (
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  path TEXT NOT NULL,
  reportedAt TEXT NOT NULL,
  PRIMARY KEY (ticketId, path)
);

CREATE TABLE fileHold (
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  path TEXT NOT NULL UNIQUE,
  sessionId TEXT REFERENCES session (id),
  since TEXT NOT NULL
);

CREATE TABLE resource (
  name TEXT PRIMARY KEY
);

CREATE TABLE resourceLock (
  resource TEXT PRIMARY KEY REFERENCES resource (name),
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  sessionId TEXT REFERENCES session (id),
  leaseUntil TEXT NOT NULL
);

CREATE TABLE resourceQueue (
  resource TEXT NOT NULL REFERENCES resource (name),
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  queuedAt TEXT NOT NULL,
  PRIMARY KEY (resource, ticketId)
);

CREATE TABLE testRun (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  kind TEXT NOT NULL CHECK (kind IN ('auto', 'visual', 'user')),
  result TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL
);

CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  sessionId TEXT REFERENCES session (id),
  ticketId TEXT REFERENCES ticket (id),
  model TEXT NOT NULL,
  inputTokens INTEGER NOT NULL,
  outputTokens INTEGER NOT NULL,
  cacheReadTokens INTEGER NOT NULL,
  cacheWriteTokens INTEGER NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('measured', 'declared')),
  at TEXT NOT NULL
);
CREATE INDEX usageByDate ON usage (at);

CREATE TABLE deliveryBatch (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  deliveredAt TEXT,
  validatedAt TEXT,
  changelog TEXT
);

CREATE TABLE deliveryBatchTicket (
  batchId TEXT NOT NULL REFERENCES deliveryBatch (id),
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  PRIMARY KEY (batchId, ticketId)
);

CREATE TABLE attachment (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL REFERENCES ticket (id),
  path TEXT NOT NULL,
  mime TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE document (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  path TEXT NOT NULL
);

CREATE TABLE preview (
  builtAt TEXT NOT NULL,
  tickets TEXT NOT NULL,
  conflicts TEXT NOT NULL
);

CREATE TABLE developer (
  lastVisitAt TEXT
);

CREATE TABLE jiraImport (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  summary TEXT NOT NULL
);
`;
