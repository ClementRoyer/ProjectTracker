# 0040. Repositories, ticket groups, reference documents

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (sub-step 13g)
- Links: [features.md](../product/features.md) F31, F23; [ADR 0014](0014-decoupage-en-paquets.md) (the CLI reads git, the server never does); [step 13 plan](../plan/etape-13.md)

## Context

F31 brings together three needs from V1: the modified files per repository, the ticket groupings and the project's reference documents. The user has a project with several repositories.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Several repositories | Yes; no, only one | **Yes, several** |
| 2. Ticket groups | **Label and filter** (recommended); one more level in the list; no groups | Label and filter |
| 3. Reference documents | **List readable by everyone** (recommended); documents per ticket; no documents | List readable by everyone |

## Decision

1. **Repositories.** The configuration names the project's repositories: `repos`, a list of `{ "name": "front", "path": "front" }`, paths relative to the project root. The CLI reports the modified files of each repository (it reads git; the server never does), paths relative to the root; the ticket record sorts them by repository. Without `repos`, nothing changes.
2. **Groups.** The developer puts a ticket in a named group (created on first use) or takes it out. The row and the card show the group; the list and the table can be filtered by group.
3. **Documents.** The configuration gives file patterns (`documents`, for example `["README.md", "docs/**/*.md"]`), relative to the project root. The page lists them and shows them as text; agents receive the list at the start of their session, and can read one through the MCP tool or the CLI. Only the files matched by the patterns can be read through the tool.

## Consequences

- New operations: put a ticket in a group; list and read the documents.
- The server reads the project's documents (read-only), as it already writes the changelog (ADR 0037).
