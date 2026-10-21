# 0002. V2 scope: local, open to multiple agents

- Status: Accepted
- Date: 2026-10-16
- Decider: the user (answer to the question "What product scope are you aiming for with the new version?")
- Links: [product audit](../analysis/2026-10-16-audit-v1/product.md) §6

## Context

V1 is entirely tied to Claude Code: hooks, the Monitor tool for listening, SendMessage and sub-agents for routing, the transcript format for cost. Several of these dependencies rely on undocumented fields. They must be checked again at each Claude Code update.

## Options considered

1. **Local, single user, tied to Claude Code**: structure and prune the code without changing the nature of the product.
2. **Local, open to multiple agents**: still a single developer on their own machine, but the core is decoupled from Claude Code. Agents go through a neutral interface (MCP server and CLI), and Claude Code becomes one adapter among others (Codex, Cursor, OpenCode…).
3. **Multiple users, team**: shared server, identities, rights, synchronisation between machines. Changes the architecture deeply.

## Decision

**Option 2: open to multiple agents.**

## Consequences

- The domain (items, questions, answers, reservations…) knows nothing about any agent runtime.
- An **MCP interface** becomes the main entry point for agents. The CLI stays for scripts and hooks. Both call the same use cases.
- Everything specific to Claude Code goes into an **adapter**: hooks, listening via Monitor, cost from the transcript, captures, guard. This is the chance to reassess expensive or fragile mechanisms.
- The **identity of an agent** (agent, session, runtime) becomes a real concept of the domain, instead of a session name completed by `--agent`.
- Out of scope: several human users, synchronisation between machines.
