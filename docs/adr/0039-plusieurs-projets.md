# 0039. Several projects: a selector

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (sub-step 13f)
- Links: [features.md](../product/features.md) F25; [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0030](0030-installation-dans-un-projet.md)

## Context

F25: switch from one project to another. ADR 0013 gives each project its server, its database and its port; nothing currently links the projects on the same machine.

## Options considered

| Option | For | Against |
|---|---|---|
| **Project selector** (recommended) | Keeps ADR 0013 as it is | We do not see what waits in the other projects |
| Selector and number of decisions per project | Overview | A public question, with no token, on each server |
| One single server for all projects | One single page | Calls ADR 0013 into question |

## Decision

- **The installation records each project** (its name, its address, its root) in a register on the machine: `~/.config/project-tracker/projects.json`. Rolling back to V1 removes it from there.
- **A "Projet" menu** in the header, when the machine has several, lists those whose server answers and opens their page. Each project keeps its server, its database and its token.
- A project's name is its folder's name.

## Consequences

- The server reads the register and checks, for the page, which servers answer (on their local addresses).
- A project installed before this decision only appears after a new installation (update).
