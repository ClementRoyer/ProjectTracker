# 0019. Code rules for agents: Karpathy and a home-made guide

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (request and choice of 2026-10-19)
- Links: [AGENTS.md](../../AGENTS.md), [code-style.md](../code-style.md); [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostic), [0018](0018-outillage-et-code-v1.md) (ESLint)

## Context

Request of the user, before any POC code: "I need you to set up code rules so as to follow good principles and have readable, professional code. Can you search online for something to give to an agent? A popular one."

Search of 2026-10-19:
- The most popular rules for agents are those drawn from Andrej Karpathy's notes on the mistakes of LLMs that write code ([forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), about 221,000 stars). They are four rules of **behaviour**: think before coding, simplicity first, surgical changes, aim for a verifiable result. Nothing on the form of the code. The repository shows no licence.
- The reference for readable TypeScript is the [Google style guide](https://google.github.io/styleguide/tsguide.html), too long to be given as it is.
- Collections of rules (awesome-cursorrules) are popular but of uneven quality.
- The guides on these files advise: precise rules rather than "write clean code"; a linter for everything that can be checked; a short root file that points to files by theme; and an `AGENTS.md` read by all agent tools.

## Options considered

| Option | Advantages | Drawbacks |
|---|---|---|
| **Karpathy + home-made guide** | Agent behaviour and code form; rules checkable in ESLint | A guide to keep up to date |
| Karpathy alone | Short, proven | Nothing on the form of the code |
| Google guide as reference | The standard | Long, does not frame the agent's behaviour |

## Decision

**Karpathy + home-made guide** (AI proposal).

- **`AGENTS.md`** at the root, read by all agent tools; `CLAUDE.md` only imports it (`@AGENTS.md`). It contains the project context, the four Karpathy rules **reworded** with the source cited (no licence, so no copy), and the non-negotiable rules.
- **[`docs/code-style.md`](../code-style.md)**: the rules the tool does not check, each one with a "to do / to avoid" example. They come from the Google guide and from the V1 style guide.
- **What can be checked goes into ESLint**: named exports only, explicit return types on what is exported, exhaustive `switch`, no nested ternary, `===`, `const`, no `console` in `core`, complexity 10, depth 3, 4 parameters, 60 lines per function and 400 lines per file (tests excluded).
- **The 400-line ceiling has no exception.** V1 had "accepted sizes" noted module by module, and their tracking cluttered its documentation (V1 audit).

## Consequences

- Every agent, whatever its tool, reads the same rules.
- A ESLint threshold that gets in the way is discussed with the user and changed in a new ADR, not by a local exception.
