# 0026. Operations catalogue, CLI, configuration and Jira client

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (four recommendations kept at the start of step 9)
- Links: [plan of step 9](../plan/etape-9.md); [ADR 0011](0011-interface-des-agents.md), [0014](0014-decoupage-en-paquets.md), [0016](0016-stack-serveur-et-validation.md); [features.md](../product/features.md) F2

## Context

Step 9 writes the entry doors of the tool. ADR 0011 wants the MCP and the CLI to offer the same operations, with the same logic on the server side. It is also necessary to choose how to read the configuration and talk to Jira, read-only.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Describe the operations | **Single catalogue** in `contract` (recommended); REST API per resource, MCP and CLI written separately | Single catalogue |
| 2. CLI arguments | **`node:util` `parseArgs`** (recommended); commander; citty | `parseArgs` |
| 3. Configuration file | **JSON validated by Zod** (recommended); JSONC; YAML | JSON + Zod |
| 4. Jira client | **Native `fetch` + Zod** (recommended); jira.js library | `fetch` + Zod |

## Decision

1. **Single catalogue of operations.** Each operation is declared once in `contract`: a name, a description, an input Zod schema and an output one, and who may call it (developer, agent, launcher). The server derives from it:
   - an HTTP route `POST /api/<operation>`;
   - an MCP tool of the same name, whose JSON Schema is derived from the Zod schema;
   - a CLI command, with its generated help.

   The logic lives in the use case of `core/usecases`; the three doors do not contain it. The page's reads (overview, detail sheet) are also operations of the catalogue.
2. **CLI with `parseArgs`** from `node:util`, without dependency.
3. **Configuration in JSON**, validated by Zod when the server starts; an error says which key is wrong. Secrets (Jira token) are never in it: the file only names the environment variable that carries them.
4. **Jira with native `fetch`**, responses validated by Zod. The client only has read requests: no write function exists in the code.

## Consequences

- Adding an operation = one catalogue entry + its use case + its tests; the page, the MCP and the CLI see it without other code.
- No new dependency for the CLI, the configuration and Jira.
- The page's event stream (SSE, ADR 0016) is not an operation: it is a separate route of the server.
