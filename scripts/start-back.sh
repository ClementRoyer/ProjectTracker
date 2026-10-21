#!/usr/bin/env bash
# Starts the back-end launcher (ADR 0046). Its token comes from the environment, else from secrets.env next to
# this script; when missing, it is asked once and kept there, readable by this user only.
set -euo pipefail

dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
config="$dir/launcher.config.json"
secrets="$dir/secrets.env"

fail() {
  printf 'start-back : %s\n' "$*" >&2
  exit 1
}

command -v node >/dev/null || fail "Node.js 22.13 ou plus récent est nécessaire : https://nodejs.org"
[ -f "$config" ] || fail "configuration introuvable : $config. Relance install-back.sh."

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
    read -r -s -p "Jeton du lanceur, affiché par start-front.sh sur la machine du développeur (saisie masquée) : " value </dev/tty
    echo >/dev/tty
    [ -n "$value" ] || fail "le jeton est vide."
    (
      umask 077
      printf "%s='%s'\n" "$name" "${value//\'/\'\\\'\'}" >>"$secrets"
    )
    chmod 600 "$secrets"
    export "$name=$value"
  else
    fail "$name manque : donne-le dans l'environnement ou dans $secrets, ou lance ce script dans un terminal."
  fi
fi

cd "$dir"
exec node "$dir/launcher.js" "$config"
