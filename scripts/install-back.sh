#!/usr/bin/env bash
# Installs the back-end launcher on the back-end server, or updates it, from a GitHub release, then starts it
# (ADR 0046, 0050, 0052):
#   curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-back.sh | bash
# Only Node.js 22.13 and curl are needed: no git, no npm, no build. Every question can be answered beforehand by its
# variable (PROJECT_TRACKER_DIR, PROJECT_TRACKER_URL ...); PROJECT_TRACKER_YES=1 takes the defaults for the others,
# PROJECT_TRACKER_NO_START=1 installs without starting.
set -euo pipefail

REPO="${PROJECT_TRACKER_REPO:-ClementRoyer/ProjectTracker}"
DEFAULT_COMMAND='claude -p --output-format json --json-schema @SCHEMA@'

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\e[1m' DIM=$'\e[2m' RED=$'\e[31m' GREEN=$'\e[32m' YELLOW=$'\e[33m' CYAN=$'\e[36m' RESET=$'\e[0m'
else
  BOLD='' DIM='' RED='' GREEN='' YELLOW='' CYAN='' RESET=''
fi
title() { printf '\n%s%s%s\n\n' "$BOLD$CYAN" "$*" "$RESET"; }
say() { printf '  %s\n' "$*"; }
ok() { printf '  %s✔%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() {
  printf '\n  %s✖ %s%s\n\n' "$RED" "$*" "$RESET" >&2
  exit 1
}
# Another program's output, set back under ours.
quote() { while IFS= read -r line; do printf '    %s%s%s\n' "$DIM" "$line" "$RESET"; done; }

# ask <variable> <question> [default]: the variable when it is set, else the terminal (even through a pipe),
# else the default.
ask() {
  local name=$1 question=$2 default=${3-} answer
  [ -n "${!name+set}" ] && return
  if [ "${PROJECT_TRACKER_YES:-}" != 1 ] && { : </dev/tty; } 2>/dev/null; then
    read -r -p "  $CYAN?$RESET $question${default:+ $DIM[$default]$RESET} " answer </dev/tty
    printf -v "$name" '%s' "${answer:-$default}"
  else
    printf -v "$name" '%s' "$default"
  fi
}
yes_to() { case "$1" in y | Y | yes | Yes | YES | o | O | oui | Oui) return 0 ;; *) return 1 ;; esac; }

need_node() {
  command -v node >/dev/null || fail "Node.js 22.13 or later is needed: https://nodejs.org"
  node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 13) ? 0 : 1)' ||
    fail "Node.js 22.13 or later is needed (found $(node --version))."
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
  curl -fsSL "$base/project-tracker.tar.gz" -o "$into/project-tracker.tar.gz" ||
    fail "release not found: $base/project-tracker.tar.gz"
  curl -fsSL "$base/SHA256SUMS" -o "$into/SHA256SUMS" || fail "checksum not found: $base/SHA256SUMS"
  if ! (cd "$into" && grep ' project-tracker.tar.gz$' SHA256SUMS | checksum); then
    fail "the release does not match its checksum (SHA256SUMS): nothing was installed."
  fi
  tar -xzf "$into/project-tracker.tar.gz" -C "$into"
}

checksum() {
  if command -v sha256sum >/dev/null; then sha256sum -c --status; else shasum -a 256 -c -s; fi
}

# Stops the launcher of this folder when start-back.sh runs it in the background.
stop_running() {
  local pidfile="$dir/launcher.pid" pid
  if [ -f "$pidfile" ] && pid=$(cat "$pidfile") && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    for _ in $(seq 1 50); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    rm -f "$pidfile"
    ok "Launcher stopped for the update"
  fi
}

need_node
command -v curl >/dev/null || fail "curl is needed."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

title "project-tracker back-end launcher"
ask PROJECT_TRACKER_DIR "Launcher folder" "$HOME/project-tracker-back"
dir=$PROJECT_TRACKER_DIR
config="$dir/launcher.config.json"

if [ -f "$config" ]; then
  fresh=false
else
  fresh=true
  title "Setup"
  ask PROJECT_TRACKER_URL "The tool's address on the private network (for example http://100.64.0.1:9620)" ""
  [ -n "$PROJECT_TRACKER_URL" ] ||
    fail "the tool's address is needed (PROJECT_TRACKER_URL): install-front.sh gives it on the developer's machine."
  ask PROJECT_TRACKER_MIRROR "Back-end mirror folder" ""
  [ -d "$PROJECT_TRACKER_MIRROR" ] || fail "mirror not found: '$PROJECT_TRACKER_MIRROR' (PROJECT_TRACKER_MIRROR)."
  mirror=$(cd "$PROJECT_TRACKER_MIRROR" && pwd)
  ask PROJECT_TRACKER_AGENT_COMMAND "Agent command (it reads the request on its standard input)" "$DEFAULT_COMMAND"
  ask PROJECT_TRACKER_MAX_PARALLEL "Back-end agents running at once, at most" 3
  ask PROJECT_TRACKER_PROXY "HTTP proxy to the private network (empty: none)" ""
fi

download "$work"
release="$work/project-tracker"
version=$(cat "$release/VERSION")
ok "Release $version downloaded and checked"
mkdir -p "$dir"
if [ -f "$dir/VERSION" ]; then
  title "Update"
  say "$dir: $(cat "$dir/VERSION") → $version"
  stop_running
else
  title "Install"
fi
for file in launcher.js hold.js start-back.sh stop-back.sh package.json VERSION; do cp "$release/$file" "$dir/$file"; done
chmod +x "$dir/start-back.sh" "$dir/stop-back.sh"

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
  ok "Configuration written: $config"
fi
ok "Launcher $version installed in $dir"

if [ "${PROJECT_TRACKER_NO_START:-}" = 1 ]; then
  title "Ready"
  say "Start the launcher: $dir/start-back.sh"
  say "The first time, it asks for the launcher token shown by start-front.sh on the developer's machine."
  exit 0
fi
if command -v pgrep >/dev/null && pgrep -f "$dir/launcher.js" >/dev/null; then
  title "Ready"
  warn "A launcher started by hand still runs from $dir: stop it (Ctrl+C), then run $dir/start-back.sh."
  exit 0
fi

title "Start"
bash "$dir/start-back.sh"
title "Ready"
say "${DIM}Stop: $dir/stop-back.sh · start again: $dir/start-back.sh$RESET"
echo
