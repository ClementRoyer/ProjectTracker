# 0025. Front-end mockups: published HTML pages, wireframe first, then the faithful version

- Status: Accepted
- Date: 2026-10-19
- Decider: the user ("add a step 8b to make front-end mockups with validation"; choice of format and finish)
- Links: [plan](../plan/v2-plan.md) step 8b; [features.md](../product/features.md); [ADR 0005](0005-frontend-svelte.md), [0016](0016-stack-serveur-et-validation.md)

## Context

Before writing the interfaces (step 9) and the Svelte page (step 10), the user wants to see and validate the screens.

## Options considered

| Question | Options | Choice |
|---|---|---|
| Format | **HTML pages published** privately on claude.ai (recommended); Svelte prototype in `packages/web`; local HTML files | HTML pages published |
| Finish | Faithful (recommended); wireframe | **First a wireframe, then a faithful version** once the wireframe is validated |

## Decision

- The mockups are **clickable HTML pages, with generic fictitious data**, published privately on claude.ai. The user comments on them directly; the AI corrects them and republishes at the same address.
- **Two passes**:
  1. **Wireframe**: organisation and content of each screen (grey blocks, real labels in French);
  2. **Faithful version**: layout, colours, light and dark themes. It serves as the reference for step 10.
- The mockup code is **disposable**: it is not the code of `packages/web`. A copy of each validated version is kept in `docs/mockups/`, with the list of choices made.

## Consequences

- The screen choices made during validation that affect the product (a feature added, removed or changed) are recorded in `features.md`, and in an ADR if they change a decision.
