# 0050. Install and start in one command

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message of 2026-10-21)
- Links: changes the launch of [ADR 0046](0046-installation-et-lancement-par-scripts.md); [step 21 plan](../plan/etape-21.md)

## Context

The user (2026-10-21): "And yet with Claude's prompt there is no need to run 2 commands, everything happens in one command."

With ADR 0046, installing took `install-front.sh` (or `install-back.sh`), then `start-front.sh` (or `start-back.sh`).

## Decision

1. **`install-front.sh` starts the server once installed**, through `start-front.sh`: the first start still asks for the missing secrets, in the same terminal. **`install-back.sh` starts the launcher** the same way, through `start-back.sh`.
2. **Never a second one**: when the server already answers on the project's port, or the launcher of that folder already runs, the script installs and asks to restart it, without starting another.
3. **`PROJECT_TRACKER_NO_START=1`** installs without starting, for scripted installs.
4. `start-front.sh` and `start-back.sh` stay, to start again later.

## Consequences

- The README's quick start is one command per side.
