# Changelog

Every published version of project-tracker, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.4] - 2026-10-21

### Added

- The install scripts start the server or the launcher right away: one command installs and starts. `PROJECT_TRACKER_NO_START=1` installs without starting; nothing starts when one already runs ([ADR 0050](docs/adr/0050-installer-et-lancer-en-une-commande.md)).
- This changelog, required for each published version and used as its release notes ([ADR 0051](docs/adr/0051-changelog-des-versions.md)).

## [2.0.3] - 2026-10-21

### Added

- `install-front.sh` sets a V1 aside: it moves it to `tools/tracker-legacy/` with its data, removes its hooks, slash commands and blocks, and installs V2 on its port, without migrating anything ([ADR 0049](docs/adr/0049-v1-mise-de-cote-sans-migration.md)).

### Fixed

- A V1 holding `tools/tracker/app/VERSION` is no longer taken for a V2 to update.

## [2.0.2] - 2026-10-21

### Fixed

- The page journey on the tab title no longer races the page loading on slower machines.

## [2.0.1] - 2026-10-21 [YANKED]

Its release workflow failed: no release was published for this tag.

### Changed

- All the documentation is in English ([ADR 0048](docs/adr/0048-documentation-en-anglais.md)).

## [2.0.0] - 2026-10-21

First public version: a full rewrite of project-tracker.

### Added

- One page for every ticket: tickets grouped by who must act, board by phase, discussion with the agents, questions with options, summary with QA deliveries and AI usage.
- Agents of any tool through MCP or the CLI; hooks for Claude Code.
- One git working folder per ticket, an integration preview, a commit command without AI co-author, and deliveries that merge each ticket in one commit.
- Shared resources, test runs, attachments, notifications, novelties, Jira loading (read-only), several projects and repositories.
- Back-end agents on another machine through a launcher, without SSH.
- Install and start scripts from the GitHub releases, with a checksum check.

[Unreleased]: https://github.com/ClementRoyer/ProjectTracker/compare/v2.0.4...HEAD
[2.0.4]: https://github.com/ClementRoyer/ProjectTracker/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/ClementRoyer/ProjectTracker/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/ClementRoyer/ProjectTracker/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/ClementRoyer/ProjectTracker/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/ClementRoyer/ProjectTracker/releases/tag/v2.0.0
