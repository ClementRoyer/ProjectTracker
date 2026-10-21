#!/usr/bin/env bash
# Stops the back-end launcher that start-back.sh runs in the background (ADR 0052).
set -euo pipefail

pidfile="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/launcher.pid"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then GREEN=$'\e[32m' RESET=$'\e[0m'; else GREEN='' RESET=''; fi

if [ ! -f "$pidfile" ] || ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
  rm -f "$pidfile"
  printf '  The launcher is not running.\n'
  exit 0
fi
pid=$(cat "$pidfile")
kill "$pid"
for _ in $(seq 1 50); do
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.2
done
rm -f "$pidfile"
printf '  %s✔%s Launcher stopped.\n' "$GREEN" "$RESET"
