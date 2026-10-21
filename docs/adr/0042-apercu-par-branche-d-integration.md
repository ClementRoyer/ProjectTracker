# 0042. Preview by integration branch: implementation

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (answers of 2026-10-20)
- Links: implements [ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md) (integration branch, one server, rebuild by command, conflicts flagged); [ADR 0041](0041-dossier-de-travail-par-ticket.md) (working folders); [step 15 plan](../plan/etape-15.md)

## Context

ADR 0009 chose an integration branch `preview`, rebuilt from the main branch by bringing together the branches of the tickets in progress, with a single development server on top. What remained to be said: which tickets go in, what to do with a conflict, who runs the server, and where the page shows it.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Tickets brought together | **Open with a working folder** (recommended); chosen at each rebuild; open except excluded | Open with a folder |
| 2. Merge conflict | **Leave the branch aside** (recommended); stop everything | Leave it aside |
| 3. Development server | **Started once by the developer** (recommended); restarted by the CLI | Started once by the developer |
| 4. Display | **Header and ticket** (recommended); summary and ticket; ticket only | Header and ticket |

## Decision

1. **Rebuild**: `tracker preview build [--base <branch>]`, run by the developer or an agent, never from the page. The folder is `.worktrees/preview`, on the branch `preview` reset to the base (`--base`, otherwise `main`) at each rebuild. The `preview` branch is disposable: never pushed, its merge commits are signed `project-tracker`.
2. **Tickets brought together**: the open tickets that have a working folder, in the order of their keys. Only committed code gets in.
3. **Conflict**: the branch's merge is cancelled and the others get in anyway. The ticket is flagged "conflit avec l'aperçu", with the files involved and the tickets already brought together that modify them. The ticket's journal notes it when the conflict appears or changes, not at each rebuild.
4. **Several repositories**: the same thing in each repository, under `.worktrees/preview/<repository path>`. A conflict in one repository leaves the ticket aside in all of them.
5. **Server**: the developer starts it themselves in `.worktrees/preview`; the rebuild updates the files and hot reload follows. The configuration can give `preview.setup` (for example `npm ci`), run in the folder after each rebuild.
6. **Page**: a badge in the header ("Aperçu : 4 tickets · il y a 5 min", in alert if there is a conflict); the ticket record says "Dans l'aperçu" or "Conflit avec l'aperçu".

## Consequences

- New operations: list the working folders of open tickets; record a rebuild; read the state of the preview.
- The database keeps the last rebuild, in the `preview` table planned from the initial schema (ADR 0015).
- The configuration gains `preview`: `{ "setup": "npm ci" }`, optional.
- The commit command of ADR 0009 remains to be done.
