# 0017. Structured agent answer in JSON

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (idea and choice of 2026-10-19)
- Links: completes [ADR 0010](0010-back-end-intervenant-du-ticket.md) (launcher); [0007](0007-acheminement-des-reponses.md), [0011](0011-interface-des-agents.md), [0012](0012-mesure-de-l-usage-ia.md), [0016](0016-stack-serveur-et-validation.md) (Zod)

## Context

Idea of the user: "In the prompt given to the AI agents, they must answer in a JSON format that you can interpret."

Today (ADR 0010 and 0011), an agent keeps the ticket up to date by calling the tool (MCP or CLI). This depends on its discipline: one forgotten call leaves the ticket without news. A final answer in an imposed format can be read by a program and recorded without the agent having to think about calling the tool.

## Options considered

| Option | Advantages | Drawbacks |
|---|---|---|
| JSON for the launcher only (AI proposal) | Where the output is always read by a program | Front-end agents do not benefit |
| **JSON for all agents** | One way to report, whatever the agent | In an interactive conversation, the output is read by a program only if the adapter can capture it; the developer sees the JSON |
| Not now | Nothing to do | The idea waits for step 9 |

## Decision

**Yes, for all agents.**

Chosen way of working:
- **One single answer schema**, defined in Zod in `contract` and passed in the launch text (and by the agent tool's option that imposes a schema, when it exists). It contains at least: the ticket, the status (`done`, `inProgress`, `blocked`, `question`), a readable message, the optional question (context, options, recommendation), the progress (done, remaining), the modified files, and the usage if the agent knows it.
- **Who reads it**:
  - the **launcher**, for each back-end execution (`claude -p`, `codex exec`, `opencode run`...);
  - the **Claude Code adapter**, at the end of each turn of a front-end agent (end-of-turn hook);
  - any other reader of the output of an agent in non-interactive mode.
- The reader **validates** the JSON and passes it to the server, which records it in the journal and updates the situation, like an MCP call.
- **Invalid or missing JSON**: the raw output is kept as it is in the journal and marked "unstructured answer". Nothing is lost.
- **MCP and CLI remain the base**: an agent whose output is read by no program (interactive tool without adapter) keeps calling the tool.

## Consequences

- The "readable message" field keeps the conversation understandable for the developer.
- The Claude Code adapter gains the reading of the end-of-turn answer.
- Risk to check in the trial of step 9: the reliability of the JSON produced by each agent tool, and the existence of an option to impose a schema.
