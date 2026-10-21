# 0041. Working folder per ticket

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (answers of 2026-10-20)
- Links: implements [ADR 0008](0008-eviter-les-conflits-entre-tickets.md) (folder per ticket, configurable preparation); [ADR 0014](0014-decoupage-en-paquets.md) (the CLI reads git, the server never does); [ADR 0040](0040-depots-groupes-documents.md) (several repositories); [step 14 plan](../plan/etape-14.md)

## Context

ADR 0008 chose a working folder per ticket (git worktree), recommended but not mandatory, with a preparation command specific to the project. What remains is to say where to create it, on which branch, how the agent finds the tool there, and what becomes of it at closing.

Difficulty noted: in a working folder, the tool's files ignored by git (`tools/tracker/app/`, `developer.token`) do not exist. The Claude Code hooks and the CLI would no longer find the tool.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Location | next to the project, `../<project>-<KEY>` (recommended); **in the project, `.worktrees/<KEY>`, ignored**; configurable | In the project, ignored |
| 2. Branch | **adjustable template, or existing branch** (recommended); always `<KEY>`; always given by hand | Adjustable template, or existing |
| 3. Access to the tool from the folder | **symbolic links** (recommended); find the main project through git | Symbolic links |
| 4. At closing | **removal command** (recommended); removal by the agent; nothing | Removal command |

## Decision

1. **Create**: `tracker worktree add <KEY> [--branch <branch>] [--base <branch>]`, run by the developer or an agent, never from the page. The folder is `.worktrees/<KEY>` at the project root. `.worktrees/` is excluded from git locally (`.git/info/exclude`), without touching the project's `.gitignore`.
2. **Branch**: `--branch`, otherwise the `worktree.branch` template of the configuration (default `ticket/{key}`). If the branch exists, the folder takes it over (case of a shared branch); otherwise it is created from the base (`--base`, otherwise `main`).
3. **Several repositories** (ADR 0040): one working folder per repository, sorted under `.worktrees/<KEY>/<repository path>`, on the same branch. The modified files are reported from `.worktrees/<KEY>` as from the root.
4. **Access to the tool**: the command links, in the folder, `tools/tracker/app` and `tools/tracker/developer.token` to those of the main project, as well as `tools/tracker/tracker.config.json`, `.mcp.json` and `.claude/settings.json` if they are not already there (uncommitted files). Hooks, MCP and CLI work without change. Linux and macOS.
5. **Prepare**: the command then runs the configuration's `worktree.setup` if given (installing dependencies, copying environment files…), in the folder, on the assignee's machine. The server still runs nothing.
6. **The ticket knows its folder** (path and branch): the ticket record shows it.
7. **Remove**: `tracker worktree remove <KEY>` removes the folder, refused by git if uncommitted changes remain; the branch is kept. The page flags a folder still present for a closed ticket.

## Consequences

- New operations: record a ticket's working folder, forget it.
- The configuration gains `worktree`: `{ "branch": "ticket/{key}", "setup": "npm ci" }`, both optional.
- The real preparation cost on the user's project (R7) remains to be measured at the first trial.
- The preview by integration branch (ADR 0009) and the commit command remain to be done.
