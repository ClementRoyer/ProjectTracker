#!/usr/bin/env bash
# Installs the back-end launcher on the back-end server, or updates it, from a GitHub release (ADR 0046):
#   curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-back.sh | bash
# Only Node.js 22.13 and curl are needed: no git, no npm, no build. Every question can be answered beforehand by
# its variable (PROJECT_TRACKER_DIR, PROJECT_TRACKER_URL…); PROJECT_TRACKER_YES=1 takes the defaults for the others.
set -euo pipefail

REPO="${PROJECT_TRACKER_REPO:-ClementRoyer/ProjectTracker}"
DEFAULT_COMMAND='claude -p --output-format json --json-schema @SCHEMA@'

say() { printf '%s\n' "$*"; }
fail() {
  printf 'install-back : %s\n' "$*" >&2
  exit 1
}

# ask <variable> <question> [default]: the variable when it is set, else the terminal (even through a pipe),
# else the default.
ask() {
  local name=$1 question=$2 default=${3-} answer
  [ -n "${!name+set}" ] && return
  if [ "${PROJECT_TRACKER_YES:-}" != 1 ] && { : </dev/tty; } 2>/dev/null; then
    read -r -p "$question${default:+ [$default]} : " answer </dev/tty
    printf -v "$name" '%s' "${answer:-$default}"
  else
    printf -v "$name" '%s' "$default"
  fi
}

need_node() {
  command -v node >/dev/null || fail "Node.js 22.13 ou plus récent est nécessaire : https://nodejs.org"
  node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 13) ? 0 : 1)' ||
    fail "Node.js 22.13 ou plus récent est nécessaire (ici $(node --version))."
}

# download <folder>: the release archive, checked against its checksum, unpacked into <folder>/project-tracker.
download() {
  local into=$1 base
  if [ -n "${PROJECT_TRACKER_BASE_URL:-}" ]; then
    base=$PROJECT_TRACKER_BASE_URL
  elif [ -n "${PROJECT_TRACKER_VERSION:-}" ]; then
    base="https://github.com/$REPO/releases/download/v${PROJECT_TRACKER_VERSION#v}"
  else
    base="https://github.com/$REPO/releases/latest/download"
  fi
  say "Téléchargement depuis $base…"
  curl -fsSL "$base/project-tracker.tar.gz" -o "$into/project-tracker.tar.gz" ||
    fail "archive introuvable : $base/project-tracker.tar.gz"
  curl -fsSL "$base/SHA256SUMS" -o "$into/SHA256SUMS" || fail "empreinte introuvable : $base/SHA256SUMS"
  if ! (cd "$into" && grep ' project-tracker.tar.gz$' SHA256SUMS | checksum); then
    fail "l'archive ne correspond pas à son empreinte (SHA256SUMS) : rien n'est installé."
  fi
  tar -xzf "$into/project-tracker.tar.gz" -C "$into"
}

checksum() {
  if command -v sha256sum >/dev/null; then sha256sum -c --status; else shasum -a 256 -c -s; fi
}

need_node
command -v curl >/dev/null || fail "curl est nécessaire."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

ask PROJECT_TRACKER_DIR "Dossier du lanceur" "$HOME/project-tracker-back"
dir=$PROJECT_TRACKER_DIR
config="$dir/launcher.config.json"

if [ -f "$config" ]; then
  fresh=false
else
  fresh=true
  ask PROJECT_TRACKER_URL "Adresse de l'outil sur le réseau privé (par exemple http://100.64.0.1:9620)" ""
  [ -n "$PROJECT_TRACKER_URL" ] ||
    fail "il faut l'adresse de l'outil (PROJECT_TRACKER_URL), donnée par install-front.sh sur la machine du développeur."
  ask PROJECT_TRACKER_MIRROR "Dossier du miroir du back-end" ""
  [ -d "$PROJECT_TRACKER_MIRROR" ] || fail "miroir introuvable : '$PROJECT_TRACKER_MIRROR' (PROJECT_TRACKER_MIRROR)."
  mirror=$(cd "$PROJECT_TRACKER_MIRROR" && pwd)
  ask PROJECT_TRACKER_AGENT_COMMAND "Commande de l'agent (elle lit la demande sur son entrée)" "$DEFAULT_COMMAND"
  ask PROJECT_TRACKER_MAX_PARALLEL "Agents back-end en parallèle, au plus" 3
  ask PROJECT_TRACKER_PROXY "Proxy HTTP vers le réseau privé (vide : aucun)" ""
fi

download "$work"
release="$work/project-tracker"
version=$(cat "$release/VERSION")
mkdir -p "$dir"
if [ -f "$dir/VERSION" ]; then
  say "Mise à jour du lanceur dans $dir : $(cat "$dir/VERSION") → $version"
else
  say "Installation du lanceur $version dans $dir"
fi
for file in launcher.js hold.js start-back.sh VERSION; do cp "$release/$file" "$dir/$file"; done
chmod +x "$dir/start-back.sh"

if [ "$fresh" = true ]; then
  TRACKER=$PROJECT_TRACKER_URL MIRROR=$mirror AGENT_COMMAND=$PROJECT_TRACKER_AGENT_COMMAND \
    MAX_PARALLEL=$PROJECT_TRACKER_MAX_PARALLEL PROXY=$PROJECT_TRACKER_PROXY node -e '
      const { TRACKER, MIRROR, AGENT_COMMAND, MAX_PARALLEL, PROXY } = process.env;
      const config = {
        tracker: TRACKER,
        mirror: MIRROR,
        maxParallel: Number(MAX_PARALLEL),
        command: AGENT_COMMAND.split(" ").filter(Boolean),
        ...(PROXY ? { proxy: PROXY } : {}),
      };
      require("node:fs").writeFileSync(process.argv[1], JSON.stringify(config, null, 2) + "\n");
    ' "$config"
  say "Configuration écrite : $config"
fi

say ""
say "Lance le lanceur : $dir/start-back.sh"
say "Au premier lancement, il demande le jeton du lanceur, affiché par start-front.sh sur la machine du développeur."
