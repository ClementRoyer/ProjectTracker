#!/usr/bin/env bash
# Starts the back-end launcher in the background (ADR 0046, 0052). Its token comes from the environment, else from
# secrets.env next to this script; when missing, it is asked once and kept there, readable by this user only.
# Log: launcher.log next to this script; stop: stop-back.sh.
set -euo pipefail

dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
config="$dir/launcher.config.json"
secrets="$dir/secrets.env"
pidfile="$dir/launcher.pid"
log="$dir/launcher.log"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  DIM=$'\e[2m' RED=$'\e[31m' GREEN=$'\e[32m' YELLOW=$'\e[33m' CYAN=$'\e[36m' RESET=$'\e[0m'
else
  DIM='' RED='' GREEN='' YELLOW='' CYAN='' RESET=''
fi
say() { printf '  %s\n' "$*"; }
ok() { printf '  %s✔%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() {
  printf '  %s✖ %s%s\n' "$RED" "$*" "$RESET" >&2
  exit 1
}
running() { [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; }

command -v node >/dev/null || fail "Node.js 22.13 or later is needed: https://nodejs.org"
[ -f "$config" ] || fail "configuration not found: $config. Run install-back.sh again."
if running; then
  ok "The launcher already runs."
  exit 0
fi

name=$(node -e '
  const config = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  console.log(config.tokenEnv ?? "TRACKER_LAUNCHER_TOKEN");
' "$config")

if [ -z "${!name-}" ] && [ -f "$secrets" ]; then
  value=$(
    # shellcheck disable=SC1090
    . "$secrets"
    printf '%s' "${!name-}"
  )
  [ -n "$value" ] && export "$name=$value"
fi

if [ -z "${!name-}" ]; then
  if [ "${PROJECT_TRACKER_YES:-}" != 1 ] && { : </dev/tty; } 2>/dev/null; then
    read -r -s -p "  $CYAN?$RESET Launcher token, shown by start-front.sh on the developer's machine (hidden) " value </dev/tty
    echo >/dev/tty
    [ -n "$value" ] || fail "the token is empty."
    (
      umask 077
      printf "%s='%s'\n" "$name" "${value//\'/\'\\\'\'}" >>"$secrets"
    )
    chmod 600 "$secrets"
    export "$name=$value"
  else
    fail "$name is missing: set it in the environment or in $secrets, or run this script in a terminal."
  fi
fi

cd "$dir"
# In the background, its output in the log; Node's experimental-feature warning is not for the user.
nohup node --disable-warning=ExperimentalWarning "$dir/launcher.js" "$config" >>"$log" 2>&1 </dev/null &
echo $! >"$pidfile"
sleep 1
if ! running; then
  rm -f "$pidfile"
  warn "The launcher stopped at start. Last lines of $log:"
  tail -n 15 "$log" | sed 's/^/    /' >&2
  exit 1
fi
ok "Launcher running"
say "${DIM}Log: $log · stop: $dir/stop-back.sh$RESET"
