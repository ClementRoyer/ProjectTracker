# V2 overhaul documentation

This folder gathers what is used to **steer the V2 overhaul** of project-tracker, which moves from a skill to a structured application. It makes it possible to find later **what was decided, when, and why**.

The V1 (code and documentation: contracts, the decision journal `review-2026-10-12.md`, the roadmap) is kept in `../legacy/` and serves as history ([ADR 0018](adr/0018-outillage-et-code-v1.md)).

The rules for agents that write code are in [`../AGENTS.md`](../AGENTS.md) and [`code-style.md`](code-style.md) ([ADR 0019](adr/0019-regles-de-code.md)).

## Organization

| Folder | Content | Lifecycle rule |
|---|---|---|
| [`product/`](product/) | What the product must do: understanding, needs, features (primary / secondary), glossary. | Living document, kept up to date. It is the reference for the "what". |
| [`adr/`](adr/) | Architecture and product decisions, one per file, numbered (ADR). | An accepted ADR is never rewritten: a new one is created that **replaces** it. |
| [`analysis/`](analysis/) | Dated audits and analyses (snapshots of the existing state at a given moment). | Never modified afterwards. A new analysis creates a new dated folder. |
| [`plan/`](plan/) | Plan of the overhaul: phases, exit criteria, progress. | Living document, updated at each phase. |
| [`architecture.md`](architecture.md) | The target architecture, one section per ADR. | Living document. |
| [`code-style.md`](code-style.md) | The code style guide, with one example per rule. | Living document; a change of threshold goes through an ADR. |

## How to find the "why"

1. **A decision**: search [`adr/README.md`](adr/README.md) (index with status). Each ADR points to the analysis that motivated it.
2. **A finding about the current state**: [`analysis/2026-10-16-audit-v1/`](analysis/2026-10-16-audit-v1/), which contains the V1 audit in four parts plus a summary.
3. **A need or a feature**: [`product/`](product/).
4. **Where the overhaul stands**: [`plan/v2-plan.md`](plan/v2-plan.md).

## Conventions

- Language: code, commit messages and documents in English; the interface in French ([ADR 0006](adr/0006-langues.md), [ADR 0048](adr/0048-documentation-en-anglais.md)).
- Dates in the format `YYYY-MM-DD`.
- Every decision made with the user becomes an ADR, written, if possible, with the user's own words.
