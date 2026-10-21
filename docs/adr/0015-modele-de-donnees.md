# 0015. Data model: current state and immutable journal

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the two questions of 2026-10-19)
- Links: [glossary](../product/glossary.md) (names of the notions and codes); [features.md](../product/features.md); [ADR 0004](0004-stockage-sqlite.md), [0007](0007-acheminement-des-reponses.md) to [0014](0014-decoupage-en-paquets.md); [architecture.md](../architecture.md) §2.6

## Context

V1 stores a ticket in eight separate streams (history, events, messages, exchanges, notes…) and in several state files, protected by home-made locks. The glossary has set a single notion: the **journal**, made of **entries** that are never changed. V2 stores everything in one SQLite database per project (ADR 0004, 0013), opened by the server alone (ADR 0011).

## Options considered

| Option | Advantages | Drawbacks |
|---|---|---|
| **Current state + journal**, written in the same transaction | Simple and fast reads; complete history | An inconsistency can only come from a bug in a use case (covered by the tests) |
| Everything derived from the journal (event sourcing) | A single source of truth | Projections, replay and evolution of event types: too complex for a local single-user tool |

## Decision

**Current state + journal** (AI proposal), and the model below, accepted by the user.

### General rules

- The **journal** (`entry`) is never changed or deleted: SQLite triggers refuse `UPDATE` and `DELETE`. A correction is a new entry.
- Each use case writes the current state and the journal entry **in the same transaction**.
- The names of tables and columns take the codes of the glossary. Dates in ISO 8601 UTC. Textual identifiers.
- **Tokens** are only stored hashed. The **model prices** are in the configuration, not in the database (ADR 0012).
- The schema evolves through numbered migrations, additive as far as possible.

### Tables

| Table | Main columns | Notes |
|---|---|---|
| `ticket` | `id`, `key`, `origin` (`jira`/`local`), `title`, `initialRequest`, `jiraUrl`, `jiraStatus`, `groupId`, `createdAt`, `closedAt` | `key` unique |
| `situation` | `ticketId`, `phase`, `progress`, `progressNote`, `waitKind`, `waitSince`, `waitDetail`, `updatedAt` | One row per ticket. The wait is **computed** for what comes from the tool (open question, back-end request, resource queue, held file) and **declared** for what is outside (end user, partner) |
| `entry` | `id`, `ticketId`, `entryType`, `authorKind` (`developer`/`agent`/`jira`/`launcher`/`system`), `sessionId`, `role`, `body` (full text), `data` (JSON), `replyTo`, `createdAt` | The journal, immutable |
| `agent` | `id`, `name`, `tool` | `name` unique, stable |
| `session` | `id`, `agentId`, `tokenHash`, `startedAt`, `lastSeenAt`, `endedAt` | The conversation (ADR 0011) |
| `assignment` | `ticketId`, `role` (`front`/`backend`), `assigneeKind` (`developer`/`agent`), `agentId`, `sessionId`, `since`, `releasedAt` | One active assignee per role and per ticket (partial unique index on `releasedAt IS NULL`) |
| `question` | `entryId`, `ticketId`, `options` (JSON), `recommendation`, `status` (`open`/`answered`), `answerEntryId` | The text is in the entry |
| `delivery` | `entryId` (answer or request), `ticketId`, `role`, `sessionId`, `deliveredAt`, `acknowledgedAt` | Routing and acknowledgement (ADR 0007) |
| `backendRequest` | `id`, `ticketId`, `entryId`, `status` (`pending`/`taken`/`running`/`done`/`failed`/`unreachable`), `createdAt` | ADR 0010 |
| `execution` | `id`, `requestId`, `launcherId`, `startedAt`, `endedAt`, `outcome`, `undeclaredChanges` | One back-end agent run |
| `launcher` | `id`, `name`, `tokenHash`, `lastSeenAt`, `heldFiles` (JSON, for information) | Signs of life and announced held files |
| `worktree` | `ticketId`, `path`, `branch`, `lastReportAt` | ADR 0008 |
| `changedFile` | `ticketId`, `path`, `reportedAt` | Reported by the CLI (ADR 0014); the overlaps are deduced from them |
| `fileHold` | `ticketId`, `path`, `sessionId`, `since` | Main folder, F34 |
| `resource`, `resourceLock`, `resourceQueue` | `name`; `resource`, `ticketId`, `sessionId`, `leaseUntil`; `resource`, `ticketId`, `queuedAt` | Lock with lease and queue |
| `testRun` | `id`, `ticketId`, `kind` (`auto`/`visual`/`user`), `result`, `note`, `at` | F17, F24 |
| `usage` | `id`, `sessionId`, `ticketId` (empty if none), `model`, `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `provenance` (`measured`/`declared`), `at` | ADR 0012 |
| `deliveryBatch`, `deliveryBatchTicket` | `id`, `name`, `deliveredAt`, `validatedAt`, `changelog`; link to the tickets | QA delivery batch, F19, F22 |
| `attachment` | `id`, `ticketId`, `path`, `mime`, `createdAt` | Files next to the database |
| `group`, `document` | `id`, `name`; `id`, `title`, `path` | Secondary |
| `preview` | `builtAt`, `tickets` (JSON), `conflicts` (JSON) | Last rebuilt preview (ADR 0009) |
| `developer` | `lastVisitAt` | The novelties (F9) are the entries posted after it |
| `jiraImport` | `id`, `at`, `summary` (JSON) | Each load; the detail is also in the journal |

## Consequences

- The novelties, the history and the record sheet are read from the journal; the overview and "what is waiting for me" are read from the current-state tables.
- The migration from V1 (`install` package) turns the eight streams into typed entries and rebuilds the state tables.
- The use-case tests check that the current state and the journal stay consistent.
