# 0031. Switching a V1 project: V1 set aside

- Status: Accepted
- Date: 2026-10-20
- Decider: the user
- Links: [ADR 0024](0024-migration-des-donnees-v1.md), [0030](0030-installation-dans-un-projet.md); [plan of step 11](../plan/etape-11.md)

## Context

V1 already occupies `tools/tracker/` in the projects, with its own `app/` and its own `tracker.config.json`. Installing V2 in the same place would overwrite V1 files, which ADR 0024 forbids ("V1 is never modified"). This collision had not been seen by ADR 0030.

## Options considered

| Option | For | Against |
|---|---|---|
| **V1 set aside** (recommended): `tools/tracker/` renamed `tools/tracker-v1/`, V1 hooks removed, V2 installed in `tools/tracker/` and migrated from `tools/tracker-v1/` | A single active tool; V2 keeps the location of ADR 0013; simple rollback | V1 stops running in this project |
| V2 next to it, in another folder | Both run at the same time | Two sets of hooks in Claude Code; a temporary location that lasts |
| Folder of choice, refusal if a V1 is there | Nothing is moved automatically | The switch is still to be done by hand |

## Decision

**V1 is set aside.** On a project where `tools/tracker/` contains a V1, the installation command:

1. removes the hooks, the commands and the `CLAUDE.md` block of V1 with **V1's own uninstall command** (`legacy/scripts/install.mjs --uninstall`), which keeps its data;
2. renames `tools/tracker/` to `tools/tracker-v1/`, **without changing anything inside it**;
3. installs V2 in `tools/tracker/` (ADR 0030);
4. migrates the data from `tools/tracker-v1/` (ADR 0024).

If a step fails, what was done is undone: the V1 folder takes back its place and its hooks are put back by V1's installation command. A **rollback** command does the same thing later, on request. `tools/tracker-v1/` is deleted by hand, when the user decides.

## Consequences

- The switch is launched from this repository, which contains V1 (`legacy/`) and V2 (`dist/`).
- The V1 code is not modified: it is only run for its uninstallation and its reinstallation.
- A V1 tracker that follows several projects requires the id of the project to migrate.
