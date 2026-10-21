# 0046. Installation and launch by scripts, from releases

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message and answers of 2026-10-21)
- Links: complements [ADR 0030](0030-installation-dans-un-projet.md) (installation in a project) and [ADR 0010](0010-back-end-intervenant-du-ticket.md) (back-end launcher); [ADR 0045](0045-projet-open-source-readme-en-anglais.md) (open-source project); [step 18 plan](../plan/etape-18.md)

## Context

The user (2026-10-21):

> "I feel like deployment is not simple, especially for the back-end agent. Create a start.sh for the front and for the back-end, as well as an install.sh. The goal is that they be simple to use, and that they ask questions if needed for the setup or the launch."

Until now, one had to clone this repository, build `dist/`, run `install.js`, write the configuration by hand, and, for the back-end, copy `launcher.js` and `hold.js`, write `launcher.config.json` and export the token.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Shape | one `install.sh` and two `start.sh` (recommended); three scripts in the repository | "Two install.sh and two start.sh, front & back every time." |
| 2. Arrival on the back-end server | clone the repository there (recommended); archive to copy; both | "I am going to deploy this repository, create releases, and the install script must be called a bit like the install scripts of the AI CLIs: `curl … install-{back/front}.sh`, and this script fetches the archive from the release and either updates or installs the new version." |
| 3. Secrets at launch | **asked once, local file** (recommended); at each launch; environment only | Asked once, local file |
| 4. Building the releases | **GitHub Actions on a tag** (recommended); local command | GitHub Actions on a tag |
| 5. Repository | — | `https://github.com/ClementRoyer/ProjectTracker` |

## Decision

1. **Four scripts**: `install-front.sh`, `install-back.sh`, `start-front.sh`, `start-back.sh`. Questions and messages are in French, like the interface (ADR 0006).
2. **Installation by `curl`**: `curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-front.sh | bash` (same for `install-back.sh`). The script downloads the release archive (`project-tracker.tar.gz`), checks its checksum (`SHA256SUMS`) and refuses an archive that does not match. `PROJECT_TRACKER_VERSION` chooses a version; `PROJECT_TRACKER_REPO` another repository.
3. **Install or update**: running the same script again updates what is installed. On the front side, it is `install.js` (ADR 0030) that does the work, with the database backed up first. On the back-end side, only the launcher and its scripts are replaced; the configuration and the secrets stay.
4. **Questions**: only on a fresh installation and only for what is missing. Front: project folder, port, Jira (address and project), back-end on another machine (private address). Back-end: installation folder, tool address, mirror, agent command, number of agents in parallel, proxy. Without a terminal, or with `PROJECT_TRACKER_YES=1`, the default values and the environment variables answer.
5. **Launch**: `tools/tracker/app/start-front.sh` in the project, `start-back.sh` in the launcher's folder. On first launch, they ask for the missing secrets (masked input) and store them in `secrets.env`, permissions 600, ignored by git. A variable already present in the environment takes precedence. The launcher's token is generated on the front side and shown once, for the back-end installation.
6. **Releases**: a tag `v<version>` (equal to the version in `package.json`) starts a GitHub Actions workflow: `npm run verify`, Playwright journeys, build, then release with the archive, its checksum and the two installation scripts.

## Consequences

- The archive contains `dist/` and the two launch scripts; `install.js` copies `start-front.sh` into `tools/tracker/app/`.
- Switching from V1 (`--from-v1`) needs the repository's V1 installer: it remains a command run from a clone, not from the archive.
- The back-end server only needs Node 22.13 and `curl`: no git, no npm, no build.
