# 0014. Splitting the code into packages

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the two questions of 2026-10-19)
- Links: [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (adapters), [0003](0003-build-a-la-release.md) (TypeScript, build), [0008](0008-eviter-les-conflits-entre-tickets.md) (overlaps), [0010](0010-back-end-intervenant-du-ticket.md) (launcher), [0011](0011-interface-des-agents.md) (single server); [architecture.md](../architecture.md) §2.5

## Context

V2 is a TypeScript repository compiled at release (ADR 0003). ADRs 0007 to 0013 bring out several programs: the server, the CLI, the page, the back-end launcher, the Claude Code adapter and the installer. It must be decided how to arrange the code and which boundaries to enforce.

## Options considered

### Granularity

| Option | Advantages | Drawbacks |
|---|---|---|
| One package per responsibility: `domain`, `app`, `store`, `jira`, `contract`, `server`, `cli`, `web`, `launcher`, `adapter-claude`, `install` (AI proposal) | Boundaries kept by the dependencies between packages | Eleven packages, many boundaries to maintain |
| **Fewer packages**: `domain`, `app`, `store` (and `jira`) grouped in a `core` package | Fewer packages and less configuration | The internal boundaries of `core` are no longer kept by npm; a checking rule is needed |

### Reading the modified files (overlaps, ADR 0008)

| Option | Advantages | Drawbacks |
|---|---|---|
| **The agent's CLI reports** the modified files, the server compares | The server never runs a command | Possible delay while an agent has reported nothing |
| The server runs read-only `git` in each working folder | Always up to date | An exception to the rule "the server never runs a command" |

## Decision

| Question | User's choice |
|---|---|
| Granularity | **Fewer packages**: `domain`, `app` and `store` grouped in `core` |
| Modified files | **The CLI reports** (AI proposal) |

Retained packages (npm workspaces, with no other monorepo tool):

| Package | Role | Never does |
|---|---|---|
| **core** | Internal folders: `domain` (glossary notions and rules, pure code), `usecases` (use cases), `store` (SQLite, migrations, backup), `jira` (read-only loading) | Anything specific to HTTP or MCP |
| **contract** | Shapes of the exchanged data: HTTP API, MCP tools, events. Shared by all the other packages, including the page | Logic |
| **server** | The only process that opens the database. HTTP API, event stream, MCP over HTTP, compiled page, token control (page, conversation, launcher) | Running a command |
| **cli** | Thin client of the API, plus the actions on the agent's machine: commit (ADR 0009), preview rebuild, preparation of a working folder, `resource run`, report of modified files | Opening the database |
| **web** | The Svelte page | — |
| **launcher** | Launcher of the back-end server (ADR 0010), delivered separately, Node only | Receiving a command |
| **adapter-claude** | What is specific to Claude Code: presentation of the conversation, usage record, channel, Monitor fallback, attribution setting | — |
| **install** | Installation, update, migration of a V1 tracker (schema 4) to SQLite | — |

Dependency rules, checked automatically:
- Within `core`, `domain` imports nothing else; `store` and `jira` import only `domain`; `usecases` imports the three.
- Only `server` imports `core`.
- The other packages talk to the server only through `contract` and the HTTP API.

Overlaps: the CLI sends the list of modified files of a working folder at each commit made by the tool and on request; the server compares the lists of the tickets in progress.

## Consequences

- The architecture check (successor of `check.mjs`) keeps the internal boundaries of `core`.
- Overlap detection depends on the CLI reports: a ticket that has not yet committed or reported anything does not appear. The page shows the date of the last report.
- The launcher and the Claude Code adapter only import `contract`: they stay light to deliver.
