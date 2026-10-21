# 0018. Repository tooling and place of the V1 code

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the questions of 2026-10-19, start of step 7)
- Links: [ADR 0003](0003-build-a-la-release.md) (build), [0014](0014-decoupage-en-paquets.md) (packages), [0016](0016-stack-serveur-et-validation.md) (stack)

## Context

Step 7 sets up the technical base. ADR 0016 planned to submit the tooling to the user before starting. It was also necessary to decide the place of the V1 code on the `v2` branch.

## Options considered

| Question | Options |
|---|---|
| Tests | **Vitest** (same engine as Vite, TypeScript without a step, coverage); `node:test` (no dependency, like V1, less equipped) |
| Lint and format | **ESLint + typescript-eslint + Prettier** (typed rules, Svelte support, import boundaries); Biome (fast, partial Svelte, no typed rules) |
| Artefact | **tsc + esbuild** (one file per program, Node only); tsc alone (a `node_modules` must be shipped) |
| V1 code | **Moved to `legacy/`** until the switch-over; removed from `v2` (viewable on `master`) |
| V1 skill usable during the rewrite | Dedicated working folder on `master`; do not move V1; let it break |

## Decision

The four AI recommendations are kept. On the V1 skill, the user answered: "No need to keep it usable."

- **Vitest** for the tests; Playwright will come with the page (ADR 0005).
- **ESLint 10 + typescript-eslint (strict typed rules) + Prettier.** ESLint also keeps the boundaries of ADR 0014. It replaces `check.mjs`.
- **tsc** checks the types; **esbuild** will produce the shipped artefact, **Vite** the page.
- **The V1 code is moved to `legacy/`**, with its `CLAUDE.md`, and will be removed at step 11.
- The link `~/.claude/skills/project-tracker` points to this folder: as long as `v2` is checked out, **the V1 skill no longer works**. This is accepted.

Installed versions (chosen among those published at least two weeks ago): TypeScript 6.0.3 (typescript-eslint does not accept 7 yet), Vitest 5.0.3, Vite 8.3.2, ESLint 10.12.0, typescript-eslint 8.71.0, Prettier 3.9.9.

## Consequences

- The blocking check becomes `npm run verify`: types, lint, format, tests.
- `.npmrc` enables `legacy-peer-deps`: without it, npm 10 crashes on Vitest's optional dependencies ("reading edgesOut").
- The `docs/` folder is no longer checked by `check.mjs`; Prettier ignores Markdown so as not to reformat it.
