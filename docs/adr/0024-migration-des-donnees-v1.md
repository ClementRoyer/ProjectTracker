# 0024. Migration of V1 data to the V2 database

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the four questions of 2026-10-19)
- Links: [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0014](0014-decoupage-en-paquets.md) (boundaries, modified here for `install`), [0015](0015-modele-de-donnees.md); V1 format: `legacy/references/state-format.md`; fixtures: `legacy/scripts/test/fixtures/`

## Context

The exit criterion of step 8 is a migration verified on the V1 fixtures. The current V1 format is **schema 4**:
- a `tools/tracker/` folder contains **several projects** (`projects/<id>/`);
- each ticket has an `item.json`, which contains its questions, messages, notes, history, decisions, memory, claim (`claim`) and files;
- four JSONL journals: `events`, `answers`, `exchanges`, `test-runs`;
- two files common to all projects: `usage.jsonl` and `locks.json`.

V1 already knows how to bring its own data from schemas 1 to 3 up to 4 (`upgrade`).

The V2 model is different:
- one database per project;
- fixed phases, instead of steps defined in the configuration;
- no "tasks" (removed on 2026-10-18);
- a single journal of typed entries.

## Options considered

| Question | AI proposal | Other options | User's choice |
|---|---|---|---|
| 1. V1 steps to phases | By the role of the step (`doing` → development, `deliver` → QA delivery...) | Everything in "To do" | **Everything in "To do"** |
| 2. `events.jsonl` | Drop it | Keep the step changes; migrate everything | **Drop it** |
| 3. Texts with no V2 notion (warnings, summary, gaps, changelog...) | One "Resumed from V1" entry per ticket | Drop them | **Drop them** |
| 4. Code boundary | `install` imports `core/store` | Migration in `core`, run by `server` | **`install` imports `core/store`** |

## Decision

### Scope and place of the code

- **Only schema 4 is read.** Older data is first brought up by the V1 `upgrade`.
- **One V1 project gives one V2 database.** The migration takes the V1 tracker folder and the project id.
- The code lives in the **`install`** package, which **may import `core/store`**: this is an exception to ADR 0014, where only `server` opens `core`. The migration runs with the server stopped. `install` imports neither `usecases` nor `jira`.
- **V1 is never modified.** The migration writes a new database and refuses to overwrite an existing one. It is done in a single transaction: all or nothing.
- The V1 files are **validated by Zod** when read; an invalid file stops the migration with a clear message.
- The migration returns a **report**: what was migrated and what was dropped, with the number and the reason.

### Mapping

| V1 | V2 |
|---|---|
| `ticket` or `topic` card | `ticket`. The key is the V1 `id`. The origin is `jira` if the project has a Jira tracker and the key follows its pattern, otherwise `local`. |
| `context.request`, `context.origin` | `initialRequest` (with the origin at the head) |
| `kind: task` | Dropped (notion removed) |
| `stage` | **Ticket not finished: "To do" phase, not started.** Ticket finished (`done`, or `doneAt` present): "QA validation" phase done, and ticket **closed** at `doneAt`, to stay compliant with the closing rule (ADR 0022). |
| `blockedBy: user` / `partner:<id>` + `waitingSince` | `developer` / `partner` wait (detail: the partner's label) |
| `questions[]` | `question` entry (text and context) + `question` line (options, recommendation, status) |
| Answers (`answers.jsonl`) | `answer` entry (choice and text), linked to its question, which moves to "answered". An answer without a question becomes a `request` entry. A withdrawn answer is not taken over. |
| `messages[]`, `notes[]`, `memory[]`, `context.history[]` | `progress` entries (full text, original date) |
| `context.decisions[]` | `decision` entries |
| `exchanges.jsonl` of the tickets | `exchange` entries, word for word, with the partner and the direction |
| `test-runs.jsonl` | `testRun` line (`auto`) + `testRun` entry; a removed run is not taken over |
| `attachments[]` + files | `attachment` line; the files are copied next to the database |
| `lots[]` | `deliveryBatch` + `deliveryBatchTicket` |
| `usage.jsonl` (lines of the project) | `usage`, `provenance: measured`; cache write = 5 min + 1 h; ticket = the first of `items` if the attribution is `held`, otherwise none |

### Dropped

- `events.jsonl` (choice of the user).
- The texts with no V2 notion (choice of the user): `warnings[]`, `summary`, `gaps[]`, `tests{}`, `changelog[]`, `activity`, `context.recommendation`, `context.docs`, `campaigns[]`, `priority`, `repos`, `branch`.
- Live coordination: `claim`, `listeners.json`, `locks.json`, `fileWait`, `files[]`.
- Technical or transit files: `captures`, `briefings`, `notices`, `server.json`, the `status` records of `answers.jsonl`.
- Project exchanges with no ticket: V2 has no journal outside a ticket.

The V1 folder stays intact: it serves as an archive.

## Consequences

- `eslint.config.js` allows `install` to import `@project-tracker/core/store`, and only that.
- `core/store` gains the write functions the migration needs (questions, test runs, attachments, deliveries, usage).
- The real phase of the tickets in progress has to be set by hand after the migration.
- The V1 priority (`priority`) is not taken over. It can be once V2 priority (ADR 0021) has its levels.
