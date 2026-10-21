# 0023. Database access: hand-written SQL on node:sqlite

- Status: Accepted
- Date: 2026-10-19
- Decider: the user ("ok, hand-written SQL, go")
- Links: [ADR 0004](0004-stockage-sqlite.md) (SQLite), [0015](0015-modele-de-donnees.md) (model), [0016](0016-stack-serveur-et-validation.md) (Zod), [0018](0018-outillage-et-code-v1.md) (Node 22.13+)

## Context

Step 8 writes `core/store`. It is necessary to choose how the code talks to the database.

## Options considered

| Option | Advantages | Drawbacks |
|---|---|---|
| **Hand-written SQL** on `node:sqlite` (recommended) | No dependency; SQL readable and reviewed as it is; the triggers of the immutable journal are written in SQL anyway | Row types to write and validate oneself |
| Kysely | Queries typed by the compiler, SQL visible | A dependency; binding to `node:sqlite` to check |
| Drizzle | Schema, types and migrations in one place | Heavier; recent support of `node:sqlite`; triggers in SQL anyway |

## Decision

**Hand-written SQL**, with Node's `node:sqlite` module (no dependency).

- The **migrations** are numbered SQL files, applied in order at startup; the number reached is kept in `PRAGMA user_version`. Each migration is applied in a transaction.
- The queries are **parameterised** (`?` or `:name`), never built by concatenating values.
- A row read is converted into a domain type by a store function; the JSON columns are validated by Zod.
- Settings at opening: foreign keys enabled, WAL journal, wait timeout if the database is busy.

## Consequences

- `core/store` depends only on `node:sqlite`, on Zod and on `core/domain`.
- The store tests run on an in-memory database (`:memory:`), without a file.
