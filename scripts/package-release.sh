#!/usr/bin/env bash
# Packs the built dist/ into a release (ADR 0046): release/project-tracker.tar.gz, its SHA256SUMS, and the two
# install scripts, served by GitHub as release assets. Run after `npm run build`.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
fail() {
  printf 'package-release: %s\n' "$*" >&2
  exit 1
}

# What the install scripts take from the archive: a release without one of them would install a broken tool.
NEEDED=(VERSION package.json install.js server.js tracker.js admin.js launcher.js hold.js web claude
  start-front.sh stop-front.sh start-back.sh stop-back.sh)

version=$(node -p 'require("./package.json").version')
[ -f dist/VERSION ] || fail "dist/ is missing: run npm run build."
[ "$(cat dist/VERSION)" = "$version" ] || fail "dist/ is $(cat dist/VERSION), package.json is $version: run npm run build again."
for entry in "${NEEDED[@]}"; do
  [ -e "dist/$entry" ] || fail "dist/$entry is missing: check build.mjs."
done

rm -rf release
mkdir release
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cp -R dist "$stage/project-tracker"
tar -czf release/project-tracker.tar.gz -C "$stage" project-tracker
(cd release && sha256sum project-tracker.tar.gz >SHA256SUMS)
cp scripts/install-front.sh scripts/install-back.sh release/
printf 'Release %s ready in release/:\n' "$version"
ls -1 release
