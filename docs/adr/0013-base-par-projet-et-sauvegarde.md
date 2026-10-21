# 0013. One database per project, in the repository, backed up by hand

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the two questions of 2026-10-19)
- Links: [ADR 0004](0004-stockage-sqlite.md) (SQLite), [0008](0008-eviter-les-conflits-entre-tickets.md) (working folders), [0011](0011-interface-des-agents.md) (single server); [needs.md](../product/needs.md) (multi-project as a bonus)

## Context

V1 installs the tool in each project (`tools/tracker/`, ignored by git), with its data files, and backs up into `tools/tracker/backups/` before each update. Multi-project is a bonus ("95% of the time it will be one project"). With the working folders (ADR 0008), several folders of the same repository work at the same time.

## Options considered

### Location

| Option | Advantages | Drawbacks |
|---|---|---|
| One database per developer, in their home folder | A single server for all projects; multi-project without effort; nothing in the repository | The tool lives far from the project |
| **One database per project, in the repository** (V1) | Everything about the project stays in the same place | One server and one port per project; multi-project requires aggregating several databases |

The AI recommended the per-developer database. The user chose the per-project database.

### Backup

| Option | Advantages | Drawbacks |
|---|---|---|
| Automatic dated copies | Protects without thinking about it | Extra code and disk space |
| Copies + readable export | Data recoverable without the tool | Even more code and space |
| **Manual only** | The simplest | Nothing protects against forgetting |

The AI recommended automatic copies. The user chose manual backup.

## Decision

| Question | User's choice |
|---|---|
| Location | **One database per project, in the repository** |
| Backup | **Manual only** |

Retained operation:
- The tool and its database live in the **main folder of the project** (`tools/tracker/`, ignored by git), as in V1.
- **The working folders have no database**: their agents reach the project's server over HTTP (ADR 0011). None of them reads or writes the database directly.
- **One server per project**, on a port configured per project.
- **A backup command** makes a consistent copy of the database (SQLite online backup, possible while the server is running) into `tools/tracker/backups/`, and a restore command puts it back in place. Nothing is backed up automatically.

## Consequences

- Multi-project (bonus) implies several servers; a shared view, if it is ever built, will have to query them. This is not planned for now.
- The backup before a tool update will be decided with the update procedure.
