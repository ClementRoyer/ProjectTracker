# 0049. V1 set aside without migration

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message of 2026-10-21)
- Links: complements [ADR 0031](0031-bascule-d-un-projet-v1.md) (switch-over of a V1 project) and [ADR 0046](0046-installation-et-lancement-par-scripts.md) (install scripts); [step 20 plan](../plan/etape-20.md)

## Context

The user (2026-10-21): "I'm going to ask an agent to recreate the tickets, so change the start script so that if it detects V1 it moves it into a legacy folder."

The switch-over of ADR 0031 migrates the V1 data and needs the V1 installer, which only lives in `legacy/` of the development repository: it cannot run from a release. The user does not need the V1 data in V2: an agent recreates the tickets. Today, `install-front.sh` stops when it finds a V1.

## Decision

1. **`install-front.sh` detects a V1** (`tools/tracker/tracker.mjs`, no V2 version) and offers to set it aside; the answer defaults to yes, and `PROJECT_TRACKER_SET_V1_ASIDE=no` refuses. It is the install script, not `start-front.sh`, that meets V1: `start-front.sh` exists only once V2 is installed.
2. **Setting V1 aside** (`install.js --set-v1-aside`):
   - `tools/tracker/` moves to `tools/tracker-legacy/`, untouched, data included;
   - what V1 wrote outside its folder is removed, as its own uninstaller does: its hooks in `.claude/settings.json` and `.claude/settings.local.json` (commands ending with `/tracker.mjs" <arguments>`), its slash commands (files marked `<!-- project-tracker command -->`), its `.gitignore` block and an older `CLAUDE.md` block (`project-tracker:start` … `project-tracker:end`). The project's own hooks, commands and lines stay;
   - V2 is then installed as new, on the port of V1 unless another one is given. Nothing is migrated.
3. **Refused** when `tools/tracker-legacy/` already exists: nothing is changed.

## Consequences

- The switch-over with migration (`--from-v1`) and its rollback stay as they were, from the development repository.
- Going back to V1 is by hand: move `tools/tracker-legacy/` back and reinstall V1 with its own installer.
