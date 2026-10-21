#!/usr/bin/env bash
# Prepares a stable version for the public branch (ADR 0047): one commit "🔖 Release v<version>" holding v2 as it
# is, without the private folders, on the local branch `public`, tagged v<version>. It never pushes: it shows the
# command, `git push origin public:master v<version>`, which also starts the release workflow (ADR 0046).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
BRANCH=public
EXCLUDED=(legacy docs/analysis docs/plan docs/mockups)

fail() {
  printf 'publish-stable : %s\n' "$*" >&2
  exit 1
}

[ "$(git branch --show-current)" = v2 ] || fail "run it from the v2 branch."
[ -z "$(git status --porcelain)" ] || fail "there are uncommitted changes: nothing is published."
version=$(node -p 'require("./package.json").version')
tag="v$version"
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  fail "the tag $tag already exists: change the version in package.json, then commit."
fi
# Each version says what it changes (ADR 0051): its section becomes the release notes.
if ! grep -q "^## \[$version\]" CHANGELOG.md 2>/dev/null; then
  fail "CHANGELOG.md has no [$version] section: rename [Unreleased] to [$version] - $(date +%F), then commit."
fi

if [ "${PUBLISH_SKIP_CHECKS:-}" != 1 ]; then
  npm run verify
  npm run e2e
fi

# The tree of v2 without the private folders, built in a separate index: the working tree is not touched.
index=$(mktemp)
trap 'rm -f "$index"' EXIT
GIT_INDEX_FILE=$index git read-tree HEAD
GIT_INDEX_FILE=$index git rm -r -q --cached --ignore-unmatch -- "${EXCLUDED[@]}"
tree=$(GIT_INDEX_FILE=$index git write-tree)

parent=$(git rev-parse -q --verify "refs/heads/$BRANCH" || true)
if [ -n "$parent" ] && [ "$(git rev-parse "$parent^{tree}")" = "$tree" ]; then
  fail "nothing changed since the last published version."
fi
# The public commits can carry another address than the private ones: git config tracker.publishEmail <address>.
email=$(git config --get tracker.publishEmail || true)
if [ -n "$email" ]; then export GIT_AUTHOR_EMAIL=$email GIT_COMMITTER_EMAIL=$email; fi
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "🔖 Release $tag")
git update-ref "refs/heads/$BRANCH" "$commit" "$parent"
git tag "$tag" "$commit"

printf 'Version %s ready in branch %s: %s files' "$tag" "$BRANCH" "$(git ls-tree -r --name-only "$commit" | wc -l | tr -d ' ')"
if [ -n "$parent" ]; then
  printf ', %s\n' "$(git diff --shortstat "$parent" "$commit" | sed 's/^ //')"
else
  printf ', first commit of the branch\n'
fi
printf 'Left out: %s\n' "${EXCLUDED[*]}"
printf 'Review it (git show --stat %s), then publish it:\n  git push origin %s:master %s\n' "$BRANCH" "$BRANCH" "$tag"
