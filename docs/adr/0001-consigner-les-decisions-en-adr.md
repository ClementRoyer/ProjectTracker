# 0001. Recording V2 decisions as ADRs

- Status: Accepted
- Date: 2026-10-16
- Decider: the user (request of 2026-10-16: "make sure everything is well structured, so that these things can be tracked later and we can find out why something was done")
- Links: [tooling audit](../analysis/2026-10-16-audit-v1/tooling.md) §4

## Context

In V1, decisions live in `references/review-2026-10-12.md`, a chronological journal that only grows, where "the most recent decision wins". To know the rule in force, you have to reread everything. Decisions have no identifier and no status, and AI proposals appear there without explicit validation by the user.

## Options considered

1. **Keep the single journal**: simple, but the reading problem gets worse over time.
2. **Numbered ADRs, one decision per file**, with a status and a "superseded by" link: a standard format, where each decision can be found and its validity is explicit.
3. **Issues or discussions on a platform**: needs a remote repository, which does not exist yet, and separates decisions from the code.

## Decision

Option 2. The V2 decisions are recorded in `docs/adr/`. The V1 journal stays in place as history and is no longer fed for V2.

## Consequences

- Any decision taken with the user gets an ADR. A proposal stays `Proposed` until the user has validated it.
- `docs/README.md` explains how to find a decision.
- The `CLAUDE.md` of the V2 branch points to `docs/` so that sessions follow this rule.
