# 0045. Open-source project: English README, MIT license

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message and answer of 2026-10-21)
- Links: complements [ADR 0006](0006-langues.md) (languages) for the README only

## Context

The user (2026-10-21):

> "The README must be in English, and rather in project-presentation mode. The wish is that this project be open-source and community-driven."

ADR 0006 puts the documentation in French. A project open to a community presents itself first through its README, read by people who do not necessarily speak French. It also needs a license so that the code can be reused and improved.

## Options considered

| Question | Options | Choice |
|---|---|---|
| License | **MIT** (recommended); Apache 2.0; AGPL 3.0; later | MIT |

## Decision

1. **The README is in English**, written as a project presentation: what it is for, its features, how it works, how to install it and contribute.
2. **MIT license**: `LICENSE` file at the root, and `"license": "MIT"` in `package.json`.
3. The rest does not change: documentation in `docs/` and interface in French, code and commits in English (ADR 0006). The README says so, and notes that a translation of the interface would be a welcome contribution.

## Consequences

- The README screenshots show an interface in French.
- Any contribution is published under the MIT license.
