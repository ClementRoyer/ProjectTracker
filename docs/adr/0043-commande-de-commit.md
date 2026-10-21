# 0043. Commit command

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (answers of 2026-10-21)
- Links: implements [ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md) (commit command, attribution disabled); [ADR 0041](0041-dossier-de-travail-par-ticket.md) (working folders); [step 16 plan](../plan/etape-16.md)

## Context

ADR 0009 chose a commit command provided by the tool, usable by any agent, which applies the project's convention without any co-author mention, the author being the developer. It also chose that the installation disables Claude Code's automatic attribution, and that the commits of a ticket could be grouped. What remained to be decided: who writes the message, which files go in, what trace goes on the ticket, and when to do the grouping.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Message | **The agent writes, the tool checks** (recommended); the tool composes from a type; no check | The agent writes, the tool checks |
| 2. Files | **Everything in a ticket folder, only the staged files in the main folder** (recommended); always the staged files; always everything | Everything in a ticket folder |
| 3. Trace | **Note in the ticket journal** (recommended); key in the message; none | Note in the journal |
| 4. Grouping | **Later, with the delivery** (recommended); now | Later |

## Decision

1. **Command**: `tracker commit "<message>" [--ticket <KEY>]`, run by an agent or the developer, on their machine; the server runs nothing.
2. **Message**: written by the agent. The tool removes the co-author lines and "Generated with", then refuses a message that does not fit on one line of 72 characters at most. With the gitmoji rule (default), it also refuses a message that does not start with an emoji followed by a space. The configuration can turn it off: `"commit": { "gitmoji": false }`.
3. **Author**: the one from the git configuration, so the developer. No mention of the agent.
4. **Files**: in `.worktrees/<KEY>`, everything that changed, in each repository touched, with the same message. In the main folder, shared between tickets, only what is already staged. Committing nothing is refused.
5. **Trace**: the ticket is the one from `--ticket`, otherwise the one of the folder `.worktrees/<KEY>`. Its journal receives "Commit a1b2c3d : <message>" (with the repository when there are several). Without a known ticket, the commit is made without a note. The key does not go into the message; the branch `ticket/<KEY>` carries it.
6. **Attribution**: the installation sets `attribution` to empty (commits and PRs) in the project's `.claude/settings.json`, if it is not already set. Removing the tool leaves it in place: this is also the developer's instruction.
7. **Grouping**: with the delivery step, which will merge the ticket's branch into the main branch.

## Consequences

- No new operation: the note goes through `recordEntry`.
- The configuration gains `commit`: `{ "gitmoji": true }`, optional.
- The instructions given to the agent at the start of the session cite the command.
