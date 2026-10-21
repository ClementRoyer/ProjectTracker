# AGENTS.md: developing project-tracker V2

Guidance for any AI agent (Claude Code, Codex, OpenCode…) that changes this repository (branch `v2`). `CLAUDE.md` only imports this file.

## What this is

A local tool for one developer who handles several tickets at once with AI agents. **The ticket is the centre**: the tool shows where every ticket stands and keeps each ticket's full record. Agents of any kind (Claude Code, Codex, OpenCode…) feed it through MCP or the CLI.

## Read first

`docs/README.md`, then:
- `docs/product/`: understanding, needs, features, **glossary** (domain names in code come from its `Code` column);
- `docs/adr/`: every decision, with the user's words. **An accepted ADR is never rewritten**: a change of mind is a new ADR that replaces it. A proposal stays `Proposée` until the user accepts it;
- `docs/architecture.md`: the target, one section per ADR;
- `docs/plan/v2-plan.md`: steps and dated journal. Update it when a step moves.

`legacy/` holds V1 (code, references, its own `CLAUDE.md`) for reference and for the V1 migration. Never change it; it goes away at the switch-over step.

## Layout

npm workspaces under `packages/` (ADR 0014): `core` (`domain`, `usecases`, `store`, `jira`), `contract`, `server`, `cli`, `web`, `launcher`, `adapter-claude`, `install`. A package is created when its plan step starts.

Boundaries, enforced by ESLint (`eslint.config.js`):
- `core/domain` is pure: no I/O, no clock, no randomness, no import outside itself;
- `core/store` and `core/jira` import only `domain`;
- only `server` imports `core`; everything else talks to it through `contract` and HTTP. One exception: `install` imports `core/domain` and `core/store` to migrate V1 data, server stopped (ADR 0024).

## How to work

Adapted from the guidelines drawn from Andrej Karpathy's notes on LLM coding mistakes ([forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)). They favour care over speed; use judgment on trivial tasks.

1. **Think before coding.** State your assumptions. If a request has several readings, present them instead of picking one silently. If something is unclear, stop and ask. If a simpler approach exists, say so.
2. **Simplicity first.** Write the least code that solves the problem: no feature, option or abstraction that was not asked for, no error handling for impossible cases. If 200 lines could be 50, rewrite them.
3. **Surgical changes.** Every changed line traces back to the request. Match the existing style; do not reformat or refactor nearby code. Remove what your own change left unused; mention other dead code instead of deleting it.
4. **Goal-driven execution.** Turn the task into a check that can pass or fail (usually a test), then loop until it passes. For several steps, write a short plan with the check of each step.

## Code style

**Read [`docs/code-style.md`](docs/code-style.md) before writing code.** Each rule there has a do/don't example. What a tool can check is in `eslint.config.js`, not in prose.

## Rules that are not negotiable

- **Ask the user** before any technical choice (library, tool, pattern with trade-offs): give a recommendation, then record the answer as an ADR.
- **Generic tool.** No customer, company, product or ticket names in code or fixtures.
- **Test first.** Write the failing test that states the rule, then the code. Tests are named after the rule.
- **Security.** The server never executes a command. The tool listens on loopback and the private network only, never on the Internet. Jira is read-only; its URL and token come from configuration and environment, never from code. Never log or return secrets.
- **Languages** (ADR 0006, 0045, 0048): code, commit messages and documents in English; the UI in French. Talk to the user in their language.
- **Changelog** (ADR 0051): a user-visible change adds a line under `[Unreleased]` in `CHANGELOG.md`, in the same commit.
- Do not commit unless the user asks.

## Blocking checks

```bash
npm run verify   # typecheck (tsc, svelte-check), lint, format check, tests
npm run e2e      # page journeys with Playwright (builds first)
```

Tooling (ADR 0018, 0028): TypeScript 6 strict, Vitest, ESLint 10 + typescript-eslint, Prettier, esbuild for the shipped artefact; Svelte 5 + Vite for the page, checked by svelte-check, eslint-plugin-svelte and prettier-plugin-svelte; Playwright for its journeys. Node 22.13 or later. `.npmrc` sets `legacy-peer-deps` because npm 10 crashes on Vitest's optional peers.
