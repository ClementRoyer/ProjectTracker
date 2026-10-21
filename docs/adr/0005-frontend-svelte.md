# 0005. Web page in Svelte + Vite + TypeScript

- Status: Accepted
- Date: 2026-10-16
- Decider: the user (answer to the question "Which technology for the web page?")
- Links: [frontend audit](../analysis/2026-10-16-audit-v1/frontend.md) §3 and §4, [0003](0003-build-a-la-release.md)

## Context

The V1 page relies on a home-made mini-framework (`web/dom.js`) and a global Redux-like store, also home-made (`web/app.js`). All the ephemeral state of the interface goes up to it. Part of the logic is duplicated with the server. The page is never tested in a real browser.

## Options considered

1. **Preact + Vite + TS**: very light, close to the current `h()` / vnodes model, migration view by view.
2. **Svelte + Vite + TS**: light, CSS limited to each component, concise syntax. All the views have to be rewritten.
3. **React + Vite + TS**: the largest ecosystem (TanStack Query, Radix), but heavier.

## Decision

**Option 2: Svelte + Vite + TypeScript**, compiled at release (ADR 0003).

## Consequences

- The views are rewritten as Svelte components. The ephemeral state of the interface becomes local to the components.
- Once typed, we keep almost as they are: the API client (`api.js`), the synchronisation (`sync.js`: ETag, invalidation by SSE), the pure selectors and the CSS tokens.
- The view models are shared and typed with the server, which removes the duplicates (`standingText`, `nameOf`…).
- Security is preserved: a single Markdown component, cleaned by DOMPurify, no `{@html}` anywhere else, a CSP without inline code, the CSRF token on writes.
- Playwright E2E tests with axe-core on generic fixtures replace part of the structural view tests.
