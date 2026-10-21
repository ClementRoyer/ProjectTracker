#!/usr/bin/env bash
# Packs the built dist/ into a release (ADR 0046): release/project-tracker.tar.gz, its SHA256SUMS, and the two
# install scripts, served by GitHub as release assets. Run after `npm run build`.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
fail() {
  printf 'package-release : %s\n' "$*" >&2
  exit 1
}

version=$(node -p 'require("./package.json").version')
[ -f dist/VERSION ] || fail "dist/ manque : lance npm run build."
[ "$(cat dist/VERSION)" = "$version" ] || fail "dist/ est en $(cat dist/VERSION), package.json en $version : relance npm run build."

rm -rf release
mkdir release
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cp -R dist "$stage/project-tracker"
tar -czf release/project-tracker.tar.gz -C "$stage" project-tracker
(cd release && sha256sum project-tracker.tar.gz >SHA256SUMS)
cp scripts/install-front.sh scripts/install-back.sh release/
printf 'Release %s prête dans release/ :\n' "$version"
ls -1 release
