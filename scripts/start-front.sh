#!/usr/bin/env bash
# Starts project-tracker for this project (ADR 0046). The secrets the configuration names (Jira credentials,
# launcher token) come from the environment, else from tools/tracker/secrets.env; a missing one is asked once
# and kept there, readable by the developer only. The launcher token is made here.
set -euo pipefail

app=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tracker=$(dirname "$app")
config="$tracker/tracker.config.json"
secrets="$tracker/secrets.env"

fail() {
  printf 'start-front : %s\n' "$*" >&2
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

command -v node >/dev/null || fail "Node.js 22.13 ou plus récent est nécessaire : https://nodejs.org"
[ -f "$config" ] || fail "configuration introuvable : $config. Installe d'abord l'outil avec install-front.sh."

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
    printf 'Jeton du lanceur créé : %s\n' "$value"
    printf 'Donne-le au lanceur sur le serveur back-end (start-back.sh le demande). Il est gardé dans %s.\n' "$secrets"
  elif can_ask; then
    if [ "$kind" = email ]; then
      read -r -p "Adresse e-mail du compte Jira ($name) : " value </dev/tty
    else
      read -r -s -p "Jeton d'API Jira ($name, saisie masquée) : " value </dev/tty
      echo >/dev/tty
    fi
    [ -n "$value" ] || fail "$name est vide."
    keep "$name" "$value"
  else
    fail "$name manque : donne-le dans l'environnement ou dans $secrets, ou lance ce script dans un terminal."
  fi
done <<<"$needed"

exec node "$app/server.js" "$config"
