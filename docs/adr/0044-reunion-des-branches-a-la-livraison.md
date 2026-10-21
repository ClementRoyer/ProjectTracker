# 0044. Merging branches at delivery

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (answers of 2026-10-21)
- Links: implements [ADR 0008](0008-eviter-les-conflits-entre-tickets.md) ("QA delivery includes merging the branches of the tickets in the batch") and the grouping of commits from [ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md); [ADR 0037](0037-changelog-de-livraison.md) (changelog); [ADR 0043](0043-commande-de-commit.md) (commit); [step 17 plan](../plan/etape-17.md)

## Context

QA delivery (F19) is already recorded by the page: a batch of tickets moves to "livraison en qualité", and the changelog is written if it is enabled. But the tickets' branches, from the working folders (ADR 0041), are merged nowhere. ADR 0008 planned it; ADR 0009 opened the possibility of grouping a ticket's commits at that moment.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Where the branches go | **Into the base branch, without pushing** (recommended); into a `delivery/<name>` branch; nothing on the git side | Into the base branch, without pushing |
| 2. Shape of the commits | **One commit per ticket** (recommended); keep the commits; chosen at each delivery | One commit per ticket |
| 3. Conflict | **All or nothing** (recommended); set the ticket aside | All or nothing |
| 4. Page | **It gives the command** (recommended); two steps (record, then merge) | It gives the command |

## Decision

1. **Command**: `tracker deliver "<name>" <KEY>… [--base <branch>] [--keep <KEY>]`, run by the developer in the main folder (recording a delivery is reserved to them); never from the page or the server.
2. **Before merging**: each repository of the main folder must be on the base (`--base`, otherwise `TRACKER_BASE`, otherwise `main`), with no uncommitted change in progress. The tickets must exist and be open.
3. **Ticket branch**: that of its working folder, otherwise that of the template (`ticket/{key}`) if it exists. A ticket with no branch, or whose branch has nothing more than the base, has nothing to merge: it is only recorded in the delivery.
4. **One commit per ticket**: the branch's commits are squashed (`merge --squash`) into one, with the message of the branch's first commit, under the developer's name. `--keep <KEY>` keeps the commits of that ticket (merge `--no-ff`, message "🔀 Merge <branch>").
5. **Several repositories**: the same in each repository where the branch has something.
6. **All or nothing**: at the first conflict, or if the delivery is refused by the server, each repository goes back to where it was; the command names the ticket and the conflicting files. Nothing is recorded.
7. **Afterwards**: the command records the delivery (`deliverBatch`). If the changelog is enabled and its file is in a repository, it commits it ("📝 Update changelog for <name>").
8. **Nothing is pushed.** Branches and working folders remain; `tracker worktree remove` removes them after closing.
9. **Page**: when a chosen ticket has a working folder, the page shows the command to copy instead of the button. Without a folder, the button stays.

## Consequences

- No new operation: the CLI reads the tickets and their folders, then records the delivery with `deliverBatch`.
- A delivered ticket keeps its branch; if it still has a folder, the preview merges it again, with no effect since its code is already in the base.
