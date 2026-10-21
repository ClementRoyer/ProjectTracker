# 0051. A changelog for each published version

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message of 2026-10-21)
- Links: [ADR 0046](0046-installation-et-lancement-par-scripts.md) (releases), [ADR 0047](0047-branche-publique-des-versions-stables.md) (public branch); not to be confused with the changelog the tool writes in the projects it tracks ([ADR 0037](0037-changelog-de-livraison.md))

## Context

The user (2026-10-21): "Keep a changelog for each version deployment."

The public releases had only GitHub's generated notes, which list commits, not what changed for a user.

## Decision

1. **`CHANGELOG.md` at the root**, in English, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: one section per version, newest first, under the headings Added, Changed, Fixed, Removed, Security; a version that was tagged but never released is marked `[YANKED]`.
2. **Each user-visible change adds a line under `[Unreleased]`**, in the same commit as the change.
3. **Releasing a version** renames `[Unreleased]` to `[<version>] - <date>` and opens a new empty `[Unreleased]`. `scripts/publish-stable.sh` refuses a version that has no section in `CHANGELOG.md`.
4. **The release notes are the version's section**, taken from `CHANGELOG.md` by the release workflow, instead of GitHub's generated notes.

## Consequences

- The versions 2.0.0 to 2.0.3, published before this decision, were written in the changelog afterwards.
- `AGENTS.md` states rule 2.
