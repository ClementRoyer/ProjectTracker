# 0047. Public branch of stable versions

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message and answers of 2026-10-21)
- Links: complements [ADR 0045](0045-projet-open-source-readme-en-anglais.md) (open-source project) and [ADR 0046](0046-installation-et-lancement-par-scripts.md) (releases); [step 19 plan](../plan/etape-19.md)

## Context

The user (2026-10-21):

> "To deploy this project we will create a new remote branch to push only stable and acceptable versions to. This remote will not have all the history of our current commits, nor the legacy folder."

The remote is `https://github.com/ClementRoyer/ProjectTracker`. Development continues on `v2`, with its whole history, locally.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Branch and history | `main`, one commit per version (recommended); `stable`, one commit per version; a single rewritten commit | "Create a `master` branch for this remote with a single commit and the version tag." |
| 2. Publishing a version | **local script, push on approval** (recommended); script that pushes | Local script, push on approval |
| 3. Excluded in addition to `legacy/` | `docs/analysis/`, `docs/plan/`, `docs/mockups/` | All three |
| 4. V1 switch-over without `legacy/` | keep the code and copy the test data (recommended); remove the switch-over | "Do nothing, let it break on the public repository: they did not have access to V1." |

## Decision

1. **Public branch `master`** on the remote, with no link to the history of `v2`. It is prepared locally in the branch `public` (the local `master` is the V1 one) and pushed with `git push origin public:master v<version>`.
2. **One commit per version**, "🔖 Release v<version>", carrying the tag `v<version>`, which starts the release (ADR 0046). The first version is the only commit of the branch; each following version adds one.
3. **Contents**: the state of `v2` at the time of publication, without `legacy/`, `docs/analysis/`, `docs/plan/` or `docs/mockups/`.
4. **`scripts/publish-stable.sh`**: from a clean `v2`, it runs `npm run verify` and the Playwright journeys, builds the commit and the tag locally, then displays what would leave and the push command. It never pushes.
5. **V1 switch-over**: nothing is changed in the code. Its two tests, which read data from `legacy/`, skip when that folder is absent: without this, the release workflow would fail on the public branch.

## Consequences

- On the public branch, `--from-v1` replies that the V1 installer cannot be found.
- The ADRs and documents that link to the excluded folders have dead links on the public side; the README does not.
- This choice about the history is to be revisited if the user wants, instead, a single rewritten commit at each version (forced push).
