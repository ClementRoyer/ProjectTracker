# 0012. Measuring AI usage: measured, otherwise declared

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the two questions of 2026-10-19)
- Links: [features.md](../product/features.md) F20 (primary); [needs.md](../product/needs.md); [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostic), [0010](0010-back-end-intervenant-du-ticket.md) (launcher), [0011](0011-interface-des-agents.md) (conversation token); [glossary](../product/glossary.md) (usage)

## Context

The user's stated need: "I need to know roughly one usage per ticket and, at dashboard level, a daily, weekly and monthly usage."

Each agent tool exposes its usage in its own way. Claude Code writes it into the saved conversation, and `claude -p` or `codex exec` give it in their JSON output. Other tools do not expose it. V1 collected usage through a hook specific to Claude Code.

## Options considered

### Source of the figures

| Option | Advantages | Drawbacks |
|---|---|---|
| **Layered: measured, otherwise declared** | Reliable when possible; no tool left out of the totals | Two qualities of figures to tell apart on display |
| Measured only | Reliable figures | Tools without measurement do not appear |
| Declared only | The most neutral | Not very reliable (forgetting, estimation by the model); the declaration itself consumes usage |

### Unit

| Option | Advantages | Drawbacks |
|---|---|---|
| **Tokens + estimated cost** | The cost makes tickets comparable | A price table to keep up to date |
| Tokens only | Raw and reliable | Less telling |
| Share of a subscription quota | Says whether the quota will run out | The real limit is poorly known |

## Decision

| Question | User's choice |
|---|---|
| Source | **Layered: measured, otherwise declared** (AI proposal) |
| Unit | **Tokens + estimated cost** (AI proposal) |

Retained operation:
- **Measured**: when the tool provides figures, the adapter collects them without any action by the agent. The Claude Code hook reads the tokens of the conversation, and the launcher reads the JSON output of the agent command.
- **Declared**: for the other tools, the agent declares its usage through the interface (MCP or CLI).
- Each record carries its **provenance** (`measured` or `declared`), its model, its tokens (input, output, cache) and its date.
- **Attachment**: a record is attached, through the conversation token (ADR 0011), to the ticket the conversation is handling at that moment. If there is none, it counts in the day's usage without a ticket.
- **Estimated cost**: it is calculated from a **price table per model, configurable in a file**. It remains indicative, even with a subscription. A model absent from the table shows its tokens without a cost.
- **Display**: usage per ticket on the record sheet, and totals per day, week and month on the dashboard. The measured share and the declared share are visible.

## Consequences

- The Claude Code adapter includes a usage record; the launcher records the usage of each execution.
- The data model gains usage records, with their provenance.
- The price table is part of the configuration; a default table is delivered and dated.
