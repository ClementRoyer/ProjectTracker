# 0037. Delivery changelog

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (sub-step 13d)
- Links: [features.md](../product/features.md) F22, F19; [step 13 plan](../plan/etape-13.md)

## Context

F22: a delivery changelog, which can be turned on. Each ticket delivered to QA adds one line to it.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Writing the line | **The agent proposes, the developer validates** (recommended); the developer alone; the agent alone | The agent proposes, the developer validates |
| 2. Output at delivery | Text to copy into the summary (recommended); **file in the repository** | File in the repository (user's choice against the recommendation) |
| 3. Activation | **Option in the configuration** (recommended); always on | Option |

## Decision

- **Activation**: `"changelog": true` in `tracker.config.json`; `changelogFile` gives the file, `CHANGELOG.md` at the project root by default. Without the option, nothing appears.
- **One line per ticket.** An agent proposes it (operation `proposeChangelog`); the developer rereads it, corrects it and accepts it in the ticket record. Only an accepted line goes into the changelog. Proposal and acceptance are noted in the journal.
- **At QA delivery** (F19), the server adds to the file a section for the delivery: its name and its date, then a line `- <key> : <line>` per ticket that has an accepted line. The most recent section comes first, under the file's title; a missing file is created with the title "Changelog". Tickets without an accepted line are named in the delivery report.
- Format proposed by the AI.

## Consequences

- It is the only place where the tool writes in the project repository; it only writes this file, and only at a delivery.
- Migration 5 of the database adds the table of changelog lines.
