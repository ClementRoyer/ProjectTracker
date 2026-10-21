#!/usr/bin/env bash
# Starts project-tracker for this project in the background (ADR 0046, 0052), and gives the prompt back once it
# answers. The secrets the configuration names (Jira credentials, launcher token) come from the environment, else
# from tools/tracker/secrets.env; a missing one is asked once and kept there, readable by the developer only. The
# launcher token is made here. Log: tools/tracker/server.log; stop: tools/tracker/app/stop-front.sh.
set -euo pipefail

app=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tracker=$(dirname "$app")
config="$tracker/tracker.config.json"
secrets="$tracker/secrets.env"
pidfile="$tracker/server.pid"
log="$tracker/server.log"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\e[1m' DIM=$'\e[2m' RED=$'\e[31m' GREEN=$'\e[32m' YELLOW=$'\e[33m' CYAN=$'\e[36m' RESET=$'\e[0m'
else
  BOLD='' DIM='' RED='' GREEN='' YELLOW='' CYAN='' RESET=''
fi
say() { printf '  %s\n' "$*"; }
ok() { printf '  %s✔%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() {
  printf '  %s✖ %s%s\n' "$RED" "$*" "$RESET" >&2
  exit 1
}

can_ask() { [ "${PROJECT_TRACKER_YES:-}" != 1 ] && { : </dev/tty; } 2>/dev/null; }

# from_file <name>: the value secrets.env gives, if any.
from_file() {
  [ -f "$secrets" ] || return 1
  local value
  value=$(
    # shellcheck disable=SC1090
    . "$secrets"
    printf '%s' "${!1-}"
  )
  [ -n "$value" ] && printf '%s' "$value"
}

keep() {
  local name=$1 value=$2
  (
    umask 077
    printf "%s='%s'\n" "$name" "${value//\'/\'\\\'\'}" >>"$secrets"
  )
  chmod 600 "$secrets"
  export "$name=$value"
}

running() { [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; }
answers() { curl -fsS -o /dev/null -m 2 "$1" 2>/dev/null; }

command -v node >/dev/null || fail "Node.js 22.13 or later is needed: https://nodejs.org"
[ -f "$config" ] || fail "configuration not found: $config. Install the tool first with install-front.sh."
url="http://127.0.0.1:$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).port ?? 9620)' "$config")"

if running; then
  ok "The server already runs: $BOLD$url$RESET"
  exit 0
fi
if answers "$url"; then
  fail "something already answers on $url (a server started by hand?): stop it, then start again."
fi

# One line per secret: its variable, then what it is.
needed=$(node -e '
  const config = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  if (config.jira) console.log(`${config.jira.emailEnv} email\n${config.jira.tokenEnv} token`);
  if (config.launcherTokenEnv) console.log(`${config.launcherTokenEnv} launcher`);
' "$config")

while read -r name kind; do
  [ -n "$name" ] || continue
  [ -n "${!name-}" ] && continue
  if value=$(from_file "$name"); then
    export "$name=$value"
  elif [ "$kind" = launcher ]; then
    value=$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')
    keep "$name" "$value"
    ok "Launcher token created: $BOLD$value$RESET"
    say "${DIM}Give it to the launcher on the back-end server (start-back.sh asks for it). It is kept in $secrets.$RESET"
  elif can_ask; then
    if [ "$kind" = email ]; then
      read -r -p "  $CYAN?$RESET Jira account email ($name) " value </dev/tty
    else
      read -r -s -p "  $CYAN?$RESET Jira API token ($name, hidden) " value </dev/tty
      echo >/dev/tty
    fi
    [ -n "$value" ] || fail "$name is empty."
    keep "$name" "$value"
  else
    fail "$name is missing: set it in the environment or in $secrets, or run this script in a terminal."
  fi
done <<<"$needed"

# In the background, its output in the log; Node's experimental-feature warning (SQLite) is not for the user.
nohup node --disable-warning=ExperimentalWarning "$app/server.js" "$config" >>"$log" 2>&1 </dev/null &
echo $! >"$pidfile"
for _ in $(seq 1 100); do
  answers "$url" && break
  if ! running; then
    rm -f "$pidfile"
    warn "The server stopped at start. Last lines of $log:"
    tail -n 15 "$log" | sed 's/^/    /' >&2
    exit 1
  fi
  sleep 0.2
done
answers "$url" || fail "the server does not answer on $url: see $log."
ok "Server running: $BOLD$url$RESET"
say "${DIM}Log: $log · stop: $app/stop-front.sh$RESET"
