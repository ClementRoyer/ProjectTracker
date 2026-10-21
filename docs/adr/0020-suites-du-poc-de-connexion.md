# 0020. Follow-ups of the connection POC: push, JSON of front-end agents, fields fixed by the launcher

- Status: Accepted
- Date: 2026-10-19
- Decider: the user ("ok for the 3 recommendations", answer to the three questions of the report)
- Links: [report of POC A](../analysis/2026-10-19-poc-connexion/README.md); completes [ADR 0007](0007-acheminement-des-reponses.md) and [ADR 0017](0017-reponse-structuree-des-agents.md)

## Context

POC A confirmed the local connections (R1 to R4), without contradicting any ADR. Three observations needed a choice:

1. The **push through a channel** works, and even directly through the HTTP server, without a stdio gateway, which the documentation does not foresee. It remains experimental, specific to Claude Code. In production it requires `--channels plugin:…`, reserved for approved plugins.
2. The **end-of-turn JSON of front-end agents** doubles their MCP calls: the progress is recorded twice. It also replaces the prose answer that the developer reads in their conversation.
3. With `--json-schema`, `claude -p` always returns valid JSON, **even when false**: to the instruction "answer only HELLO", it returned `ticketId: "HELLO"`. The schema guarantees the form, not the truth.

## Options considered

| Question | Options | AI recommendation |
|---|---|---|
| 1. Push | Keep it on top of the pulled answer and the wait; or do without it | Keep it on top |
| 2. Front-end JSON | (a) as it is; (b) kept, without the duplicates; (c) for the front end, only the readable message and the question | (c) |
| 3. Fields known to the launcher | Keep them in the schema; or remove them | Remove them |

## Decision

The three recommendations are kept.

1. **The push remains an accelerator for Claude Code**, as ADR 0007 planned. The pulled answer and the wait remain the base, because they work with any agent.
   - The server sends the `notifications/claude/channel` notification on the HTTP MCP session of the conversation, **without a stdio gateway**.
   - For each conversation token, the server keeps the last MCP session that used it: a resumption opens a new session.
   - In production, the Claude Code adapter is delivered as a plugin, so that the channel can be enabled without the development option.
   - This HTTP passage is not documented. If a version of Claude Code breaks it, we fall back to the stdio gateway, already tried in the POC.
2. **Two forms of answer, from the same schema** in `contract`:
   - **back-end (read by the launcher)**: the full answer of ADR 0017, that is status, message, question, progress and modified files;
   - **front-end (read by the end-of-turn hook)**: only the **readable message** and the optional **question**. The progress and the files go through the MCP tools or the CLI, which the front-end agent already uses.
3. **The launcher fixes by itself what it knows**, such as the ticket, the back-end request and the execution. These fields **do not appear** in the schema asked of the agent. They are added by the reader (launcher or adapter) before sending to the server. Likewise, the adapter links the front-end answer to the ticket according to the conversation it comes from, not according to the text of the agent (the link between the Claude Code conversation and the token still has to be established at step 9).

## Consequences

- ADR 0017 applies with these details: a base schema, a reduced variant for the front end, and no field the reader already knows.
- The developer's conversation with a front-end agent stays readable: only a short structured ending is added.
- The Claude Code plugin becomes the delivery form of `adapter-claude` (step 9). Its installation still has to be described.
