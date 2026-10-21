# Architecture

- Status: **target settled** (step 5 of the [plan](plan/v2-plan.md), 2026-10-19)
- Decisions: [ADR](adr/README.md)

## 1. Today (V1.2, 2026-10-19)

Description of the existing system, to serve as a starting point. It is not the target.

```
 DEVELOPER'S MACHINE                                       BACK-END SERVER 
 ┌──────────────────────────────────────────────────┐      ┌──────────────────────┐
 │                                                  │      │                      │
 │  Browser ── dashboard page                       │      │  Session Claude Code │
 │      │  HTTP + SSE (localhost:9500)              │      │  back-end (unique,   │
 │      ▼                                           │      │  started by hand,    │
 │  ┌────────────── tools/tracker/ ──────────────┐  │      │  remote-control)     │
 │  │ server HTTP (node) ──read──┐               │  │      │      │               │
 │  │                            ▼               │  │      │      │ modifies      │
 │  │ CLI tracker ──writes──► files JSON/JSONL   │  │      │      ▼               │
 │  │   (file locks,         projects/<id>/…     │  │      │  Back-end mirror     │
 │  │    intentions .pending)                    │  │      │  (no git)            │
 │  │ Jira reading (API) ◄── config + variables  │  │      │      │               │
 │  └──────────────▲─────────────────────────────┘  │      └──────┼───────────────┘
 │                 │ CLI calls                      │             │ manual copy  
 │  ┌──────────────┴─────────────────────────────┐  │             ▼
 │  │ Claude Code front sessions                 │  │      ┌──────────────────────┐
 │  │  • conversation "listening" (dispatcher)   │  │      │ Back-end server      │
 │  │    watch under Monitor, relaunched < 30 min│  │      │ deployed             │
 │  │  • sub-agents per ticket (≤ 3)             │  │      └──────────────────────┘
 │  │  • hooks: instructions, guard, capture,    │  │
 │  │    usage, reinjection after compaction     │  │
 │  │  one shared code folder (git)              │  │
 │  └──────────────────────┬─────────────────────┘  │
 │                         │                        │
 └─────────────────────────┼────────────────────────┘
                           │ messages across sessions (remote-control)
                           ▼
                ┌──────────────────────┐
                │  Relay Anthropic     │◄──────── session back-end
                └──────────────────────┘
```

Highlights:
- **The whole tool is local**, copied into the project (`tools/tracker/`). The server and the CLI read and write the same files, hence the homemade locks.
- **No direct network link** between the developer's machine and the back-end server. The sessions talk through Anthropic's relay. The corporate network sometimes prevents SSH.
- **The back-end** is a single session, shared by all tickets. It modifies a mirror without git, which the developer copies by hand to the deployed server.
- **Exchanges with the back-end** are captured by hooks on the front side, then stored in the ticket.

## 2. Target (V2)

The accepted decisions are: routing of responses (0007), conflicts and working folders (0008), preview and commits (0009), back-end (0010), agents' interface (0011), AI usage (0012), database and backup (0013), packages (0014), data model (0015), stack (0016), structured agent response (0017), follow-ups of the connection POC (0020, 0021).

### 2.1 Back-end ([ADR 0010](adr/0010-back-end-intervenant-du-ticket.md), [0021](adr/0021-suites-du-poc-reseau-et-lanceur.md))

- Without TUN, Tailscale in userspace mode: the tool listens on the loopback only, protected by a Headscale access rule (the back-end server, on the tool's port). The launcher can go through an HTTP proxy.
- A request blocked by a held file is automatically re-run when it is released, by ticket priority then arrival order. An undeclared change over several executions is flagged on each ongoing ticket, "auteur incertain".

```
 DEVELOPER'S MACHINE                            BACK-END SERVER (the code stays here)
 ┌────────────────────────────────────┐        ┌─────────────────────────────────────┐
 │  Web page ──► TOOL (local server)  │        │  LAUNCHER (started once by hand)    │
 │               • SQLite database    │◄──────►│                                     │
 │               • HTTP API + MCP     │private │   │ picks up back-end requests      │
 │                    ▲               │network │   ▼ runs a fresh agent per request  │
 │  Front agents ─────┘ (MCP or CLI)  │(Head-  │  Back-end agent "ticket A" ────┐    │
 │  (any agent tool)                  │ scale, │  Back-end agent "ticket B" ────┤    │
 │  one working folder per ticket     │ encr.) │  (configurable command)        │    │
 └────────────────────────────────────┘        │  .lock locks (launcher's   ◄───┤    │
                                               │  folder, off the mirror)       ▼    │
                                               │                            Mirror   │
                                               └──────────────────┬──────────────────┘
                                                                  │ manual copy
                                                                  ▼
                                                       Deployed back-end server
```

- The tool listens on the loopback and on the private network, never on the Internet. Connections always start from the back-end server.
- The launcher only runs the configured agent command. It receives text, never commands.
- Front and back-end are two assignees of the same ticket. They exchange through the ticket journal, with the routing of ADR 0007.

### 2.2 Agents' interface ([ADR 0011](adr/0011-interface-des-agents.md))

```
 Agent (any tool) ──MCP over HTTP──┐
 Agent ── CLI (thin client)  ─HTTP─┤
 Back-end launcher ──HTTP (private)┼──► LOCAL SERVER ──► SQLite 
 Page ──HTTP + event stream────────┘      (only writer)
```

- The server is the only door into the database. MCP and CLI offer the same operations.
- An agent introduces itself with a stable name and receives a conversation token, attached to each call.
- Server absent: clear error, the developer starts it by hand. Nothing is started implicitly.

### 2.3 AI usage ([ADR 0012](adr/0012-mesure-de-l-usage-ia.md))

- Measured by the adapters (Claude Code hook, JSON output read by the launcher), otherwise declared by the agent; each reading carries its origin.
- Attached to the ticket in charge of the conversation (token of ADR 0011).
- Tokens + estimated cost (configurable price table); per ticket, and per day, week and month, in the developer's time zone ([ADR 0022](adr/0022-regles-du-domaine-confirmees.md)).

### 2.4 Database and backup ([ADR 0013](adr/0013-base-par-projet-et-sauvegarde.md))

- One SQLite database per project, in `tools/tracker/` of the main folder, ignored by git; one server per project, on a configured port.
- Working folders have no database: their agents go through the server of the project.
- Backup and restore by command, by hand.

### 2.5 Packages ([ADR 0014](adr/0014-decoupage-en-paquets.md))

```
                     ┌────────────┐
                     │  contract  │  shapes of exchanges (HTTP, MCP, events)    
                     └─────┬──────┘
     ┌──────────┬──────────┼──────────┬───────────────┬──────────┐
     ▼          ▼          ▼          ▼               ▼          ▼
 ┌────────┐ ┌───────┐ ┌───────┐ ┌──────────┐ ┌───────────────┐ ┌─────────┐
 │ server │ │  cli  │ │  web  │ │ launcher │ │adapter-claude │ │ install │
 └───┬────┘ └───────┘ └───────┘ └──────────┘ └───────────────┘ └─────────┘
     ▼
 ┌───────────────────────────────┐
 │ core                          │
 │  usecases ──► domain          │
 │     │   └──► store ──► domain │
 │     └──────► jira  ──► domain │
 └───────────────────────────────┘
```

- Only `server` imports `core` and opens the database; the others go through `contract` and the HTTP API. Exception: `install` opens `core/domain` and `core/store` to migrate the V1 data, with the server stopped ([ADR 0024](adr/0024-migration-des-donnees-v1.md)).
- The server runs no command: the CLI reports the modified files for the detection of overlaps.

### 2.6 Data model ([ADR 0015](adr/0015-modele-de-donnees.md))

```
 ticket ──┬── situation (current state: phase, progress, wait)     
          ├── entry (immutable journal, full text)    
          ├── assignment (one assignee per role) ── session ── agent  
          ├── question ── delivery (handover, acknowledged) 
          ├── backendRequest ── execution ── launcher
          ├── worktree, changedFile, fileHold, resourceLock / resourceQueue
          ├── testRun, usage, attachment
          └── deliveryBatch (delivery batch)  
```

- Current state and journal written in the same transaction; the journal refuses any modification.

### 2.7 Stack and agent response ([ADR 0016](adr/0016-stack-serveur-et-validation.md), [0017](adr/0017-reponse-structuree-des-agents.md), [0020](adr/0020-suites-du-poc-de-connexion.md))

- Page: Svelte 5 + Vite + TS. Server: Hono on Node, official MCP SDK. Validation: Zod in `contract`.
- Each agent ends with a JSON response that follows a single schema. The launcher and the Claude Code adapter read it, validate it and send it to the server; an invalid output is kept raw. MCP and CLI remain the foundation.
- Full response for the back-end (read by the launcher); for the front, only the readable message and the question (read by the end-of-turn hook). The reader adds the ticket, the request and the execution itself: a valid JSON is not necessarily true.
- Developer's response: pulled and expected for every agent; additionally pushed to Claude Code by a channel, sent on the MCP HTTP session of the conversation. The Claude Code adapter is delivered as a plugin.
