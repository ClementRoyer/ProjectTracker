#!/usr/bin/env bash
# Installs project-tracker in a project, or updates it, from a GitHub release (ADR 0046):
#   curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-front.sh | bash
# Every question can be answered beforehand by its variable (PROJECT_TRACKER_ROOT, PROJECT_TRACKER_PORT…);
# PROJECT_TRACKER_YES=1 takes the defaults for the others.
set -euo pipefail

REPO="${PROJECT_TRACKER_REPO:-ClementRoyer/ProjectTracker}"

say() { printf '%s\n' "$*"; }
fail() {
  printf 'install-front : %s\n' "$*" >&2
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

ask PROJECT_TRACKER_ROOT "Dossier du projet" "$PWD"
root=$(cd "$PROJECT_TRACKER_ROOT" 2>/dev/null && pwd) || fail "dossier introuvable : $PROJECT_TRACKER_ROOT"
config="$root/tools/tracker/tracker.config.json"
installed="$root/tools/tracker/app/VERSION"

download "$work"
release="$work/project-tracker"
version=$(cat "$release/VERSION")

# An installed V2 is updated; V1 has its own app/VERSION (1.x) and is set aside below (ADR 0049).
if [ -f "$installed" ] && [ ! -f "$root/tools/tracker/tracker.mjs" ]; then
  say "Mise à jour de project-tracker dans $root : $(cat "$installed") → $version"
  node "$release/install.js" --root "$root"
else
  aside=()
  port=9620
  if [ -f "$root/tools/tracker/tracker.mjs" ]; then
    say "Une V1 de project-tracker est installée dans ce projet."
    ask PROJECT_TRACKER_SET_V1_ASIDE \
      "La mettre de côté dans tools/tracker-legacy (ses données gardées, rien de migré, ses hooks et commandes retirés) et installer la V2 ? (oui/non)" oui
    case "$PROJECT_TRACKER_SET_V1_ASIDE" in
      o | O | oui | Oui | OUI | y | Y | yes | Yes) aside=(--set-v1-aside) ;;
      *) fail "V1 gardée en place : rien n'est installé." ;;
    esac
    port=$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).port ?? 9620)' "$config")
  fi
  say "Installation de project-tracker $version dans $root"
  ask PROJECT_TRACKER_PORT "Port du serveur" "$port"
  ask PROJECT_TRACKER_JIRA_URL "Adresse de Jira, lue seulement (vide : sans Jira)" ""
  if [ -n "$PROJECT_TRACKER_JIRA_URL" ]; then
    ask PROJECT_TRACKER_JIRA_PROJECT "Clé du projet Jira (par exemple PROJ)" ""
    [ -n "$PROJECT_TRACKER_JIRA_PROJECT" ] || fail "il faut la clé du projet Jira (PROJECT_TRACKER_JIRA_PROJECT)."
  fi
  ask PROJECT_TRACKER_PRIVATE_ADDRESS \
    "Un agent back-end sur une autre machine ? Adresse de cette machine sur le réseau privé (vide : non)" ""
  node "$release/install.js" --root "$root" --port "$PROJECT_TRACKER_PORT" ${aside[@]+"${aside[@]}"}
  JIRA_URL=${PROJECT_TRACKER_JIRA_URL} JIRA_PROJECT=${PROJECT_TRACKER_JIRA_PROJECT:-} \
    PRIVATE_ADDRESS=${PROJECT_TRACKER_PRIVATE_ADDRESS} node -e '
      const fs = require("node:fs");
      const file = process.argv[1];
      const config = JSON.parse(fs.readFileSync(file, "utf8"));
      const { JIRA_URL, JIRA_PROJECT, PRIVATE_ADDRESS } = process.env;
      if (JIRA_URL) {
        config.jira = { baseUrl: JIRA_URL, project: JIRA_PROJECT, emailEnv: "JIRA_EMAIL", tokenEnv: "JIRA_TOKEN" };
      }
      if (PRIVATE_ADDRESS) {
        config.privateAddresses = [PRIVATE_ADDRESS];
        config.launcherTokenEnv = "TRACKER_LAUNCHER_TOKEN";
      }
      fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
    ' "$config"
  if [ -n "$PROJECT_TRACKER_PRIVATE_ADDRESS" ]; then
    say ""
    say "Back-end : sur le serveur back-end, lance"
    say "  curl -fsSL https://github.com/$REPO/releases/latest/download/install-back.sh | bash"
    say "avec l'adresse de l'outil http://$PROJECT_TRACKER_PRIVATE_ADDRESS:$PROJECT_TRACKER_PORT ;"
    say "le jeton du lanceur s'affiche au premier lancement de start-front.sh."
  fi
fi

say ""
say "Lance le serveur : cd \"$root\" && tools/tracker/app/start-front.sh"
