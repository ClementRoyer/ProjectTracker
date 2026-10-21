# 0009. Preview and commits of the working folders

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers of 2026-10-19)
- Links: complements [ADR 0008](0008-eviter-les-conflits-entre-tickets.md); [features.md](../product/features.md) F24 (visual test), F19 (delivery); [needs.md](../product/needs.md) M8

## Context

The user raised two difficulties with the working folders (2026-10-19):

> "The problem with the subtrees is that it's hard to start the server on each subtree to see where the developments stand or to check information visually."

> "The subtrees require committing and pushing, except that if Claude does it, it adds the co-author, which is wrong because it may not have taken part at all."

## Difficulty 1: seeing a ticket running

### Options

**V1. One server per working folder**, each on a port assigned by the tool. We see all the tickets at the same time. But this means N servers to run (memory, start-up time) and N installations.

**V2. A single preview, switched from one ticket to another.** One development server, on a fixed port. The developer chooses which ticket is "en aperçu", and the preview shows the code of that ticket. This matches how they work: they validate one ticket visually at a time. Two ways to implement it, to be chosen after the trial planned by ADR 0008:
- stop the server and restart it in the ticket's folder (each folder must then be installed);
- keep the server in the main folder and bring the ticket's code into it (git: move to the latest commit of the ticket).

**V3. An integration branch.** All the branches in progress are continuously merged into a preview branch. We see everything together, and conflicts appear early. But it is the most complex option, and the result never shows an isolated ticket.

**V4. Stay in the main folder for very visual tickets.** ADR 0008 already allows this. We lose isolation for these tickets.

### AI proposal

**V2, a single switchable preview**, complemented by V4 case by case.

- Switching the preview is an **action of the assignee or the developer** (command), never of the page, which runs nothing. The page shows which ticket is in preview.
- **The preview is a shared resource** in the sense of ADR 0008: one ticket at a time, and the others wait.

## Difficulty 2: commits and co-author

### Findings

- **No need to push.** The working folders of the same repository share the same git history. A branch committed in one folder is visible straight away from the main folder. `push` is only needed to publish to the remote repository, as today.
- **Committing is still necessary** to merge the branches, or to bring the code into the preview (V2, second way).
- **The co-author mention** is added by Claude Code according to its attribution setting. It is disabled in the project settings. The exact name of the setting will be checked at implementation.

### AI proposal

1. **Installing the tool disables automatic attribution** in the project's Claude Code settings, as the user's global instructions already ask.
2. **A commit command provided by the tool**, usable by any agent. It applies the project convention (gitmoji, one simple sentence in English), with no co-author mention at all, and the author is the developer (git configuration). This no longer depends on the agent tool.
3. **The intermediate commits of a ticket can be squashed** when the branches are merged, at the developer's choice. What enters the main branch is then one clean commit per ticket.

## Decision

| Question | User's choice |
|---|---|
| Seeing a ticket running | **V3, an integration branch** (and not the V2 proposal of the AI) |
| Commits | "Yes": attribution disabled, plus the tool's commit command, plus the possibility to squash a ticket's commits |

**Preview operation retained**:
- an **integration branch** (`preview`) is rebuilt from the main branch, by merging into it the branches of the tickets in progress;
- **a single development server** runs on this branch, in a dedicated folder, on a fixed port;
- rebuilding is a command, started by an assignee or by the developer, never by the page. The page shows which tickets are in the preview and when it was rebuilt;
- **a merge conflict is flagged on the tickets concerned**. It complements the overlap detection (ADR 0008) with a real merge test, earlier than delivery.

## Consequences

- New concepts: **integration branch** and **preview** (the server running on it).
- New commands: rebuild the preview; commit according to the convention.
- Tickets must commit to enter the preview: the tool's commit command makes this simple.
- The installer changes the project's attribution setting.
