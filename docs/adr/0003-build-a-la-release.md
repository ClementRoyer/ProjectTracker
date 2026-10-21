# 0003. Dependencies and build in the repository, standalone artefact delivered

- Status: Accepted
- Date: 2026-10-16
- Decider: the user (answer to the question "What do we do with the constraint 'zero dependency, copied as is'?")
- Links: [tooling audit](../analysis/2026-10-16-audit-v1/tooling.md) §3, [backend audit](../analysis/2026-10-16-audit-v1/backend.md) §5

## Context

V1 imposes "no dependency, copied as is" on both the installed product **and** the development repository. This forced the team to reimplement typing (absent), validation (`schema.mjs`), a transactional base (`transaction.mjs`), a rendering framework (`dom.js`) and a JavaScript parser (`check.mjs`).

## Options considered

1. **Build at release**: TypeScript and dependencies in the repository. We deliver a compiled, standalone artefact, still without `npm install` on the user's side.
2. **npm package** installed globally (`npx project-tracker`): no more copy in each project, but a dependency on the npm registry.
3. **Keep zero dependencies**: JSDoc + `tsc --checkJs`, vendored libraries. The gains are limited.

## Decision

**Option 1: build at release.**

## Consequences

- The repository becomes a TypeScript project with development and runtime dependencies, a compilation step, standard linting and analysis tools.
- The "zero dependency" constraint now only applies to **the delivered artefact**: a compiled folder, embedded, that runs with Node alone.
- A release step produces this artefact, versioned and tagged. Installation and update copy the artefact, never the working folder again.
- `check.mjs` is reduced to the business rules; the rest moves to standard tools.
- The minimum Node version is raised to **22.13** (see [0004](0004-stockage-sqlite.md)).
