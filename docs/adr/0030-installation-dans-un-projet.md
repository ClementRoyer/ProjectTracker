# 0030. Installation in a project, hooking up Claude Code, backup on update

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (questions asked at the start of step 11)
- Links: [plan of step 11](../plan/etape-11.md); [ADR 0003](0003-build-a-la-release.md), [0011](0011-interface-des-agents.md), [0013](0013-base-par-projet-et-sauvegarde.md), [0024](0024-migration-des-donnees-v1.md)

## Context

Step 11 delivers the tool into the user's projects and moves their V1 trackers to V2. ADR 0013 places the tool and its database in `tools/tracker/` of each project and leaves open the backup before an update. It is necessary to choose how the tool gets into a project, how Claude Code is hooked up to it, and when the database is backed up.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Install and update | **Command run from this repository**, which copies the artefact into the project (recommended); npm package installed globally | Command run from this repository |
| 2. Hook up Claude Code | **Project settings**: `.claude/settings.json` and `.mcp.json` written by the installation (recommended); plugin installed once for the user | Project settings |
| 3. Backup before an update | **Automatic on update** (recommended); manual only, with a reminder | Automatic |

## Decision

1. **One installation command, run from this repository.** `npm run build` produces `dist/`, with the version number. `node dist/install.js --root <project>` copies the server, the CLI, the page and the Claude Code scripts into `<project>/tools/tracker/app/`, creates the configuration (port of choice) if it is missing, and ignores in git the database, the backups, the token and `app/`. Run again on an already installed project, the same command updates it: the configuration and the data stay.
2. **Claude Code is hooked up through the project settings.** The installation adds to `.claude/settings.json` the adapter's hooks (session start, turn start, turn end) and the address of the project's tracker, and to `.mcp.json` the MCP over HTTP. What the project already owns in these files is kept. The installation report also gives the MCP address and the CLI command, for the other agents (Codex, OpenCode...).
3. **The update backs up the database first**, in `tools/tracker/backups/`, before touching anything, and says where the copy is. The rest of the time, the backup stays manual (ADR 0013): a backup command, hot, and a restore command, with the server stopped.

## Consequences

- No npm registry: the user keeps this repository to install and update.
- Each project has its own copy of the tool, at its version; an update is done project by project.
- The Claude Code plugin in `dist/claude-plugin` stays useful for trials (`--plugin-dir`), but the installation does not use it.
- The migration of a V1 tracker (ADR 0024) goes through the same command, on a project with no V2 database.
