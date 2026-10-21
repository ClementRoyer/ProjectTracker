# 0054. The installer finds the project's repositories

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (answer of 2026-10-21)
- Links: completes [ADR 0040](0040-depots-groupes-documents.md) (several repositories) and [ADR 0052](0052-installation-retours-du-premier-deploiement.md)

## Context

The user's project is a folder of several applications with cross-application components; each application has its own git repository, and Claude Code is started from the folder above them all, where the tool is installed. The tool handles several repositories (`repos` in the configuration, ADR 0040), but the installer never filled that key, so working folders, changed files, commits, the preview and deliveries did not see the applications.

Two corrections were offered: find the repositories at install, and also track sessions started inside one application (hooks in each repository's local settings). The user chose the first only.

## Decision

1. **When the project folder is not itself a git repository**, the installer looks for git repositories in its subfolders, two levels down, leaving out `tools/`, `.worktrees/` and `node_modules/`.
2. It lists the ones the configuration does not declare yet and offers to add them to `repos` (default yes; `PROJECT_TRACKER_ADD_REPOS=no` declines). Each is named after its folder, or after its path when two folders share a name.
3. It does so on a new install and on each update, so that a repository added later is found too. Declared repositories are never removed.

## Consequences

- Sessions started inside one application are still not tracked automatically (hooks are read only where Claude Code starts); the user starts Claude Code from the top folder.
