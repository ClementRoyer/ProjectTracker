# 0004. Native SQLite storage (`node:sqlite`)

- Status: Accepted
- Date: 2026-10-16
- Decider: the user (answer to the question "Which storage for the tracker's data?")
- Links: [backend audit](../analysis/2026-10-16-audit-v1/backend.md) §2 and §5

## Context

V1 stores everything in JSON and JSONL files (schema 4: `project.json`, `tickets/<ID>/item.json`, journals, global files `listeners.json` and `locks.json`). So that several agents and the server can write without getting in each other's way, it reimplements a transactional base:
- file locks with liveness detection by pid;
- replayed `.pending/` intentions;
- "settled" reads with retries;
- validation and a diff of the whole project on every write.

## Options considered

1. **Native SQLite (`node:sqlite`)**:
   - ACID transactions, WAL mode, several processes handled by `busy_timeout`;
   - targeted writes;
   - no native dependency to distribute;
   - in return, the data can no longer be read or compared in git.
2. **Keep the JSON files**: readable and versionable, but the home-made mini-base remains to be maintained.

## Decision

**Option 1: native SQLite.**

## Consequences

- Node **22.13 or later** is required: `node:sqlite` is available there without any option. Node 18 is no longer maintained.
- A `storage` layer behind a data repository interface. The append-only journals (events, exchanges, test-runs, answers) become append-only tables.
- An **event outbox** written in the same transaction feeds the page's real-time stream, instead of file watching.
- Readability is offset by the generated record (`brief.md`) and an export command.
- The installer performs a **last migration** of the files (schema 4) to SQLite, tested on the existing fixtures and checked by fingerprints.
- The location of the database (inside the project or outside the repository) and its backup still need to be decided.
