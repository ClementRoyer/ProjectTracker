#!/usr/bin/env bash
# Parcours primaires de bout en bout (étape 9i), avec de vrais agents Claude Code (modèle Haiku).
# Usage : npm run build && e2e/parcours.sh [dossier de travail]
set -euo pipefail
REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d)}
PORT=9680
JIRA_PORT=9681
export TRACKER_LAUNCHER_TOKEN=launcher-$RANDOM$RANDOM
export E2E_JIRA_EMAIL=dev@example.test E2E_JIRA_TOKEN=fake-token
TRACKER="node $REPO/dist/tracker.js"
step() { printf '\n== %s\n' "$*"; }
check() { if eval "$2"; then echo "OK  $1"; else echo "ÉCHEC  $1"; FAILED=1; fi; }
FAILED=0

step "Préparation dans $WORK"
mkdir -p "$WORK/project/tools/tracker" "$WORK/backend/mirror/api" "$WORK/front"
cat > "$WORK/project/tools/tracker/tracker.config.json" <<JSON
{ "port": $PORT, "launcherTokenEnv": "TRACKER_LAUNCHER_TOKEN",
  "jira": { "baseUrl": "http://127.0.0.1:$JIRA_PORT", "project": "DEMO", "emailEnv": "E2E_JIRA_EMAIL", "tokenEnv": "E2E_JIRA_TOKEN" },
  "prices": { "claude-haiku-5-5": { "input": 1, "output": 5, "cacheRead": 0.1, "cacheWrite": 1.25 } } }
JSON
printf 'export function listOrders(orders) {\n  return orders.map((order) => ({ id: order.id, date: order.date }));\n}\n' > "$WORK/backend/mirror/api/orders.js"
node "$REPO/e2e/fake-jira.mjs" $JIRA_PORT & JIRA_PID=$!
node "$REPO/dist/server.js" "$WORK/project/tools/tracker/tracker.config.json" > "$WORK/server.log" 2>&1 & SERVER_PID=$!
trap 'kill $JIRA_PID $SERVER_PID ${LAUNCHER_PID:-} 2>/dev/null || true' EXIT
sleep 2
cd "$WORK/project"

step "1. Le développeur charge Jira et crée un ticket local (F2, F3)"
$TRACKER load-from-jira | tee "$WORK/jira.json"
$TRACKER create-ticket --title "Nettoyer les logs du serveur de test" > /dev/null
check "DEMO-1 chargé de Jira" "grep -q DEMO-1 $WORK/jira.json"

step "2. Le lanceur démarre sur le « serveur back-end » (ADR 0010)"
cat > "$WORK/backend/launcher.config.json" <<JSON
{ "tracker": "http://127.0.0.1:$PORT", "name": "serveur-back-end", "mirror": "mirror", "maxSeconds": 300,
  "command": ["claude", "-p", "--output-format", "json", "--model", "haiku", "--json-schema", "@SCHEMA@",
              "--permission-mode", "acceptEdits", "--allowedTools", "Read,Edit,Write,Glob,Grep,Bash(node:*)"] }
JSON
node "$REPO/dist/launcher.js" "$WORK/backend/launcher.config.json" > "$WORK/launcher.log" 2>&1 & LAUNCHER_PID=$!

step "3. L'agent front prend DEMO-1, rapporte, pose une question et demande au back-end"
printf '{ "mcpServers": { "tracker": { "type": "http", "url": "http://127.0.0.1:%s/mcp" } } }' $PORT > "$WORK/front/mcp.json"
TOOLS="mcp__tracker__introduce,mcp__tracker__takeTicket,mcp__tracker__getTicket,mcp__tracker__reportProgress,mcp__tracker__askQuestion,mcp__tracker__requestBackend,mcp__tracker__waitForInbox,mcp__tracker__listInbox,mcp__tracker__acknowledge,mcp__tracker__recordEntry"
(cd "$WORK/front" && claude -p "Tu es un agent front, serveur MCP tracker. 1) introduce avec le nom front-1. 2) getTicket DEMO-1 puis takeTicket DEMO-1 rôle front. 3) reportProgress DEMO-1 : inProgress, note 'analyse de la liste des commandes'. 4) askQuestion DEMO-1 : 'Faut-il afficher aussi l heure ?' avec options Oui et Non, recommandation Non. 5) requestBackend DEMO-1 : 'Dans api/orders.js, ajoute à chaque commande un champ dateLabel au format jour/mois/année (toLocaleDateString fr-FR).' 6) Réponds OK, sans attendre." \
  --mcp-config "$WORK/front/mcp.json" --strict-mcp-config --allowedTools "$TOOLS" --model haiku --output-format json < /dev/null > "$WORK/front-1.json")
SESSION=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).session_id)' "$WORK/front-1.json")

step "4. Le développeur voit ce qui l'attend et répond (F12, F13, F14)"
$TRACKER list-waiting-for-me | tee "$WORK/waiting.json"
QUESTION=$(node -e 'const i=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).items.find((x)=>x.kind==="question");console.log(i?i.questionId:"")' "$WORK/waiting.json")
check "la question attend le développeur" "[ -n '$QUESTION' ]"
$TRACKER answer-question --questionId "$QUESTION" --answer "Non, la date seule." > /dev/null

step "5. Le back-end traite la demande (attente jusqu'à 5 minutes)"
for _ in $(seq 1 100); do
  $TRACKER get-ticket DEMO-1 > "$WORK/ticket.json"
  if grep -q '"authorKind": "launcher"' "$WORK/ticket.json"; then break; fi
  sleep 3
done
check "le back-end a répondu" "grep -q '\"authorKind\": \"launcher\"' $WORK/ticket.json"
check "le miroir est modifié" "grep -q dateLabel $WORK/backend/mirror/api/orders.js"

step "6. L'agent front reprend sa conversation et reçoit réponse et back-end (F15)"
(cd "$WORK/front" && claude -p "Appelle listInbox sur le serveur tracker (ton jeton est dans ton contexte : passe-le en argument token). Confirme chaque élément reçu avec acknowledge. Puis recordEntry DEMO-1 de type decision : la date seule, sans l'heure, d'après la réponse du développeur. Réponds en une phrase avec ce que le développeur et le back-end ont dit." \
  --resume "$SESSION" --mcp-config "$WORK/front/mcp.json" --strict-mcp-config --allowedTools "$TOOLS" --model haiku --output-format json < /dev/null > "$WORK/front-2.json")
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).result)' "$WORK/front-2.json"

step "7. Le développeur suit, livre, valide et clôt (F9, F10, F17, F19, F18)"
$TRACKER list-novelties > "$WORK/novelties.json"
$TRACKER list-tickets > "$WORK/tickets.json"
BATCH=$($TRACKER deliver-batch --name "Livraison de démonstration" --keys DEMO-1 | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).id)')
$TRACKER validate-batch --batchId "$BATCH" > /dev/null
$TRACKER close-ticket DEMO-1 > "$WORK/closed.json"
$TRACKER get-ticket DEMO-1 > "$WORK/final.json"
$TRACKER usage-summary --period day > "$WORK/usage.json"
check "nouveautés listées" "grep -q DEMO-1 $WORK/novelties.json"
check "réponse prise en compte" "node -e 'const t=JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\"));process.exit(t.entries.some((e)=>e.entryType===\"answer\"&&e.acknowledgedAt)?0:1)' $WORK/final.json"
check "décision au journal" "grep -q '\"entryType\": \"decision\"' $WORK/final.json"
check "ticket clos" "grep -q '\"closedAt\": \"20' $WORK/final.json"
check "usage mesuré du back-end" "grep -q DEMO-1 $WORK/usage.json"

step "Journal final de DEMO-1"
node -e 'const t=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const e of t.entries)console.log("-",e.createdAt.slice(11,19),e.entryType.padEnd(15),(e.author??e.authorKind).padEnd(9),e.body.replace(/\n/g," ").slice(0,110))' "$WORK/final.json"
exit $FAILED
