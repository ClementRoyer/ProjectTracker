#!/usr/bin/env bash
# Installs project-tracker in a project, or updates it, from a GitHub release, then starts it (ADR 0046, 0050, 0052):
#   curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-front.sh | bash
# Every question can be answered beforehand by its variable (PROJECT_TRACKER_ROOT, PROJECT_TRACKER_PORT ...);
# PROJECT_TRACKER_YES=1 takes the defaults for the others, PROJECT_TRACKER_NO_START=1 installs without starting.
set -euo pipefail

REPO="${PROJECT_TRACKER_REPO:-ClementRoyer/ProjectTracker}"

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

# The first port from 9620 that is free here and not taken by another project of the registry (ADR 0039, 0052).
free_port() {
  node -e '
    const net = require("node:net");
    const used = new Set();
    try {
      for (const project of JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))) {
        used.add(Number(new URL(project.url).port));
      }
    } catch {}
    const free = (port) => new Promise((done) => {
      const server = net.createServer();
      server.once("error", () => done(false));
      server.once("listening", () => server.close(() => done(true)));
      server.listen(port, "127.0.0.1");
    });
    (async () => {
      for (let port = 9620; port < 9720; port += 1) {
        if (!used.has(port) && (await free(port))) return console.log(port);
      }
      console.log(9620);
    })();
  ' "${TRACKER_REGISTRY:-$HOME/.config/project-tracker/projects.json}"
}

config_port() { node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).port ?? 9620)' "$1"; }

# Stops the server this project runs in the background, if any.
stop_running() {
  local pidfile="$root/tools/tracker/server.pid" pid
  if [ -f "$pidfile" ] && pid=$(cat "$pidfile") && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    for _ in $(seq 1 50); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    rm -f "$pidfile"
    ok "Server stopped for the update"
  fi
}

# A project folder that is not a git repository but holds several (one per application): the ones the
# configuration does not declare yet are offered for `repos` (ADR 0040, 0054).
declare_repos() {
  git -C "$root" rev-parse --git-dir >/dev/null 2>&1 && return
  local found
  found=$(cd "$root" && find . -mindepth 2 -maxdepth 3 -name .git \
    -not -path './tools/*' -not -path './.worktrees/*' -not -path '*/node_modules/*' |
    sed 's#^\./##; s#/\.git$##' | sort)
  [ -n "$found" ] || return 0
  local new
  new=$(FOUND=$found node -e '
    const config = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
    const known = new Set((config.repos ?? []).map((repo) => repo.path));
    console.log(process.env.FOUND.split("\n").filter((path) => !known.has(path)).join("\n"));
  ' "$config")
  [ -n "$new" ] || return 0
  title "Repositories"
  say "This folder holds git repositories the tool does not follow yet:"
  while IFS= read -r repo; do say "  $repo"; done <<<"$new"
  ask PROJECT_TRACKER_ADD_REPOS "Follow them (working folders, changed files, commits, preview, deliveries)? (yes/no)" yes
  yes_to "$PROJECT_TRACKER_ADD_REPOS" || return 0
  NEW=$new node -e '
    const fs = require("node:fs");
    const file = process.argv[1];
    const config = JSON.parse(fs.readFileSync(file, "utf8"));
    const repos = config.repos ?? [];
    const paths = [...repos.map((repo) => repo.path), ...process.env.NEW.split("\n")];
    const base = (path) => path.split("/").pop();
    const named = (path) => (paths.filter((other) => base(other) === base(path)).length > 1 ? path : base(path));
    for (const path of process.env.NEW.split("\n")) repos.push({ name: named(path), path });
    config.repos = repos;
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  ' "$config"
  ok "$(wc -l <<<"$new" | tr -d ' ') repositories followed"
}

need_node
command -v curl >/dev/null || fail "curl is needed."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

title "project-tracker"
ask PROJECT_TRACKER_ROOT "Project folder" "$PWD"
root=$(cd "$PROJECT_TRACKER_ROOT" 2>/dev/null && pwd) || fail "folder not found: $PROJECT_TRACKER_ROOT"
config="$root/tools/tracker/tracker.config.json"
installed="$root/tools/tracker/app/VERSION"

download "$work"
release="$work/project-tracker"
version=$(cat "$release/VERSION")
ok "Release $version downloaded and checked"

fresh=false
# An installed V2 is updated; V1 has its own app/VERSION (1.x) and is set aside below (ADR 0049).
if [ -f "$installed" ] && [ ! -f "$root/tools/tracker/tracker.mjs" ]; then
  title "Update"
  say "$root: $(cat "$installed") → $version"
  stop_running
  node --disable-warning=ExperimentalWarning "$release/install.js" --root "$root" | quote
else
  fresh=true
  aside=()
  port=$(free_port)
  if [ -f "$root/tools/tracker/tracker.mjs" ]; then
    title "Version 1 found"
    say "project-tracker V1 is installed in this project."
    ask PROJECT_TRACKER_SET_V1_ASIDE \
      "Move it to tools/tracker-legacy (its data kept, nothing migrated, its hooks and commands removed) and install V2? (yes/no)" yes
    yes_to "$PROJECT_TRACKER_SET_V1_ASIDE" || fail "V1 kept in place: nothing was installed."
    aside=(--set-v1-aside)
    port=$(config_port "$config")
  fi
  title "Setup"
  ask PROJECT_TRACKER_PORT "Server port" "$port"
  ask PROJECT_TRACKER_JIRA_URL "Jira address, read only (empty: no Jira)" ""
  if [ -n "$PROJECT_TRACKER_JIRA_URL" ]; then
    ask PROJECT_TRACKER_JIRA_PROJECT "Jira project key (for example PROJ)" ""
    [ -n "$PROJECT_TRACKER_JIRA_PROJECT" ] || fail "the Jira project key is needed (PROJECT_TRACKER_JIRA_PROJECT)."
    ask PROJECT_TRACKER_JIRA_PARENTS "Parent tickets or epics, comma-separated (empty: the whole project)" ""
  fi
  ask PROJECT_TRACKER_PRIVATE_ADDRESS \
    "Back-end agents on another machine? This machine's private network address (empty: no)" ""
  title "Install"
  node --disable-warning=ExperimentalWarning "$release/install.js" --root "$root" --port "$PROJECT_TRACKER_PORT" ${aside[@]+"${aside[@]}"} | quote
  JIRA_URL=$PROJECT_TRACKER_JIRA_URL JIRA_PROJECT=${PROJECT_TRACKER_JIRA_PROJECT:-} \
    JIRA_PARENTS=${PROJECT_TRACKER_JIRA_PARENTS:-} PRIVATE_ADDRESS=$PROJECT_TRACKER_PRIVATE_ADDRESS node -e '
      const fs = require("node:fs");
      const file = process.argv[1];
      const config = JSON.parse(fs.readFileSync(file, "utf8"));
      const { JIRA_URL, JIRA_PROJECT, JIRA_PARENTS, PRIVATE_ADDRESS } = process.env;
      if (JIRA_URL) {
        const parents = JIRA_PARENTS.split(",").map((key) => key.trim().toUpperCase()).filter(Boolean);
        config.jira = {
          baseUrl: JIRA_URL,
          project: JIRA_PROJECT,
          ...(parents.length > 0 ? { parents } : {}),
          emailEnv: "JIRA_EMAIL",
          tokenEnv: "JIRA_TOKEN",
        };
      }
      if (PRIVATE_ADDRESS) {
        config.privateAddresses = [PRIVATE_ADDRESS];
        config.launcherTokenEnv = "TRACKER_LAUNCHER_TOKEN";
      }
      fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
    ' "$config"
fi
ok "project-tracker $version installed in $root/tools/tracker"
declare_repos

url="http://127.0.0.1:$(config_port "$config")"
if [ "${PROJECT_TRACKER_NO_START:-}" = 1 ]; then
  title "Ready"
  say "Start the server: cd \"$root\" && tools/tracker/app/start-front.sh"
  say "Then open $BOLD$url$RESET"
  exit 0
fi

title "Start"
(cd "$root" && bash tools/tracker/app/start-front.sh)

jira=$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).jira ? "yes" : "")' "$config")
if [ "$fresh" = true ] && [ -n "$jira" ]; then
  title "Jira"
  if preview=$(cd "$root" && node --disable-warning=ExperimentalWarning tools/tracker/app/tracker.js preview-jira-load 2>/dev/null); then
    read -r count new <<<"$(node -e 'const p = JSON.parse(process.argv[1]); console.log(p.read, p.created.length)' "$preview")"
    say "$count tickets are assigned to you in Jira, $new of them new here."
    if [ "$new" -gt 0 ]; then
      ask PROJECT_TRACKER_LOAD_JIRA "Load them now? (yes/no)" yes
      if yes_to "$PROJECT_TRACKER_LOAD_JIRA"; then
        (cd "$root" && node --disable-warning=ExperimentalWarning tools/tracker/app/tracker.js load-from-jira >/dev/null)
        ok "$new tickets loaded from Jira (nothing was written to Jira)"
      fi
    fi
  else
    warn "Jira did not answer: check its address and your credentials, then load from the page."
  fi
fi

title "Ready"
ok "Dashboard: $BOLD$url$RESET"
say "${DIM}Stop: tools/tracker/app/stop-front.sh · start again: tools/tracker/app/start-front.sh$RESET"
if [ "$fresh" = true ] && [ -n "${PROJECT_TRACKER_PRIVATE_ADDRESS:-}" ]; then
  say ""
  say "On the back-end server, run:"
  say "  curl -fsSL https://github.com/$REPO/releases/latest/download/install-back.sh | bash"
  say "with the tool's address http://$PROJECT_TRACKER_PRIVATE_ADDRESS:$PROJECT_TRACKER_PORT and the launcher token shown above."
fi
echo
