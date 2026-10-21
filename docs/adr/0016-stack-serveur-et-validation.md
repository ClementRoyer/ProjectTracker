# 0016. Stack: Svelte confirmed, Hono for the server, Zod for validation

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers of 2026-10-19, after his remark "You did not ask me which stack to start from, which front-end framework, etc.")
- Links: [ADR 0003](0003-build-a-la-release.md) (build), [0005](0005-frontend-svelte.md) (Svelte), [0011](0011-interface-des-agents.md) (single server), [0014](0014-decoupage-en-paquets.md) (packages)

## Context

ADR 0005 (Svelte) is dated 2026-10-16, before the work on needs. The server framework and the validation library had never been put to the user. The AI intended to choose them alone at step 7; the user pointed this out, and the three questions were put to him.

## Options considered

| Question | Options |
|---|---|
| Web page | **Keep Svelte 5 + Vite + TS** (mostly a reading page, light); React + Vite (larger ecosystem, heavier); Vue 3 + Vite (in between) |
| HTTP server | **Hono** (small, typed, SSE and middlewares, easy to embed); Fastify (very mature, more "framework"); `node:http` alone (everything to rewrite, as in V1) |
| Validation | **Zod** (de facto standard, used by the official MCP SDK); Valibot (lighter, less widespread); TypeBox (native JSON Schema, less pleasant) |

## Decision

The three AI recommendations are retained:
- **Web page: Svelte 5 + Vite + TypeScript.** ADR 0005 is confirmed.
- **Server: Hono** on Node, for the HTTP API, the event stream (SSE) and the MCP over HTTP (official MCP SDK).
- **Validation: Zod**, in the `contract` package. A single schema serves the server, the CLI, the page, the MCP tools and the agents' structured answer ([ADR 0017](0017-reponse-structuree-des-agents.md)). The JSON Schemas needed by the agent tools are derived from it.

## Consequences

- The remaining tooling choices (test runner, lint, format) will be proposed to the user at the start of step 7, and not chosen alone.
- Hono and Zod are embedded in the delivered artefact (ADR 0003): installation stays "Node only".
