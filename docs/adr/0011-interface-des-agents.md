# 0011. Agent interface: a single server, one identity per conversation

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the three questions of 2026-10-19)
- Links: [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostic), [0004](0004-stockage-sqlite.md) (SQLite), [0007](0007-acheminement-des-reponses.md) (routing), [0010](0010-back-end-intervenant-du-ticket.md) (remote launcher); [architecture.md](../architecture.md) §2.2; [glossary](../product/glossary.md) (agent, conversation, assignee)

## Context

Agents, whatever their tool (ADR 0002), must read and write the tickets. V1 has only a CLI, which writes directly into the data files in competition with the server: hence the home-made locks and the `.pending/` intentions. The agent identifies itself there by a name declared on each call (`--agent`).

Since ADR 0010, a remote client (the launcher) already goes through HTTP. Three questions remained open: how agents get through, how they identify themselves, and what to do if the server is not running.

## Options considered

### 1. How agents get through

| Option | Advantages | Drawbacks |
|---|---|---|
| **Single HTTP server**: the page, the API, the MCP (over HTTP) and the CLI go through the local server, the only one writing to the database | A single writer; a single business logic; already needed for the remote launcher | The server must run for the agents to work |
| MCP over stdio and a CLI that write directly to SQLite | No server needed for local agents | Several competing writers (the V1 lock problem); HTTP is still needed for the launcher |
| CLI only | The simplest, works everywhere | No typed tools for agents that handle MCP; text output to interpret |

### 2. Identification of an agent

| Option | Advantages | Drawbacks |
|---|---|---|
| **Stable name + conversation token** | Distinguishes two conversations of the same agent; links answers, assignments and usage without error | A registration step at start-up, done by the adapters |
| Name only, on each call (V1) | The simplest | Two conversations with the same name are confused; a typo creates a false assignee |
| Fixed token per agent, configured | The strictest | Heavy: configure everything before launching an agent |

### 3. Server not running

| Option | Advantages | Drawbacks |
|---|---|---|
| The CLI starts the server | Transparent for the agents | A process started implicitly, harder to track |
| **Clear error, manual start** | Simple and predictable; the developer always knows what is running | An agent is blocked as long as the server is not started |
| Permanent system service | Always available | Depends on the operating system; heavier installation |

## Decision

| Question | User's choice |
|---|---|
| How agents get through | **Single HTTP server** (AI proposal) |
| Identification | **Stable name + conversation token** (AI proposal) |
| Server not running | **Clear error, manual start** (and not the automatic start proposed by the AI) |

Retained operation:
- **The local server is the only entry point to the database.** It serves the page (HTTP + event stream), the HTTP API, the MCP over HTTP and the launcher's access. It alone opens the SQLite database.
- **The CLI is a thin client of the HTTP API.** MCP and CLI offer the same operations, with the same server-side logic.
- **On start-up, an agent introduces itself** with a stable name (for example `front-1`) and receives a **conversation token**. This token goes with each call: header for the MCP, environment variable for the CLI. A resumption opens a new conversation with the same name. The adapters (Claude Code, launcher) do the introduction automatically.
- **If the server does not answer**, the CLI and the MCP fail with a clear message that says how to start it. Nothing is started implicitly. The remote launcher retries, as planned by ADR 0010.

## Consequences

- The V1 data file locks and `.pending/` intentions disappear: SQLite and a single writer replace them.
- The conversation token is distinct from the page's token and from the launcher's token; each one only opens its own operations.
- The instructions given to the agents say what to do if the server does not answer: report to the developer, do not work around it.
- The developer starts the server himself (`tracker serve`); the installation and the documentation say so from the start.
