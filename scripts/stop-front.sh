#!/usr/bin/env bash
# Stops the project-tracker server that start-front.sh runs in the background (ADR 0052).
set -euo pipefail

tracker=$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")
pidfile="$tracker/server.pid"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then GREEN=$'\e[32m' RESET=$'\e[0m'; else GREEN='' RESET=''; fi

if [ ! -f "$pidfile" ] || ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
  rm -f "$pidfile"
  printf '  The server is not running.\n'
  exit 0
fi
pid=$(cat "$pidfile")
kill "$pid"
for _ in $(seq 1 50); do
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.2
done
rm -f "$pidfile"
printf '  %s✔%s Server stopped.\n' "$GREEN" "$RESET"
