#!/usr/bin/env bash
# Primary end-to-end journeys (step 9i), with real Claude Code agents (Haiku model).
# Usage: npm run build && e2e/parcours.sh [working folder]
set -euo pipefail
REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d)}
PORT=9680
JIRA_PORT=9681
export TRACKER_LAUNCHER_TOKEN=launcher-$RANDOM$RANDOM
export E2E_JIRA_EMAIL=dev@example.test E2E_JIRA_TOKEN=fake-token
TRACKER="node $REPO/dist/tracker.js"
step() { printf '\n== %s\n' "$*"; }
check() { if eval "$2"; then echo "OK  $1"; else echo "FAIL  $1"; FAILED=1; fi; }
FAILED=0

step "Setup in $WORK"
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

step "1. The developer loads Jira and creates a local ticket (F2, F3)"
$TRACKER load-from-jira | tee "$WORK/jira.json"
$TRACKER create-ticket --title "Clean up the test server logs" > /dev/null
check "DEMO-1 loaded from Jira" "grep -q DEMO-1 $WORK/jira.json"

step "2. The launcher starts on the \"back-end server\" (ADR 0010)"
cat > "$WORK/backend/launcher.config.json" <<JSON
{ "tracker": "http://127.0.0.1:$PORT", "name": "back-end-server", "mirror": "mirror", "maxSeconds": 300,
  "command": ["claude", "-p", "--output-format", "json", "--model", "haiku", "--json-schema", "@SCHEMA@",
              "--permission-mode", "acceptEdits", "--allowedTools", "Read,Edit,Write,Glob,Grep,Bash(node:*)"] }
JSON
node "$REPO/dist/launcher.js" "$WORK/backend/launcher.config.json" > "$WORK/launcher.log" 2>&1 & LAUNCHER_PID=$!

step "3. The front agent takes DEMO-1, reports, asks a question and asks the back-end"
printf '{ "mcpServers": { "tracker": { "type": "http", "url": "http://127.0.0.1:%s/mcp" } } }' $PORT > "$WORK/front/mcp.json"
TOOLS="mcp__tracker__introduce,mcp__tracker__takeTicket,mcp__tracker__getTicket,mcp__tracker__reportProgress,mcp__tracker__askQuestion,mcp__tracker__requestBackend,mcp__tracker__waitForInbox,mcp__tracker__listInbox,mcp__tracker__acknowledge,mcp__tracker__recordEntry"
(cd "$WORK/front" && claude -p "You are a front agent, tracker MCP server. 1) introduce with the name front-1. 2) getTicket DEMO-1 then takeTicket DEMO-1 role front. 3) reportProgress DEMO-1: inProgress, note 'analysing the order list'. 4) askQuestion DEMO-1: 'Should the time be shown too?' with options Yes and No, recommendation No. 5) requestBackend DEMO-1: 'In api/orders.js, add to each order a dateLabel field in day/month/year format (toLocaleDateString en-GB).' 6) Answer OK, without waiting." \
  --mcp-config "$WORK/front/mcp.json" --strict-mcp-config --allowedTools "$TOOLS" --model haiku --output-format json < /dev/null > "$WORK/front-1.json")
SESSION=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).session_id)' "$WORK/front-1.json")

step "4. The developer sees what waits for them and answers (F12, F13, F14)"
$TRACKER list-waiting-for-me | tee "$WORK/waiting.json"
QUESTION=$(node -e 'const i=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).items.find((x)=>x.kind==="question");console.log(i?i.questionId:"")' "$WORK/waiting.json")
check "the question waits for the developer" "[ -n '$QUESTION' ]"
$TRACKER answer-question --questionId "$QUESTION" --answer "No, the date only." > /dev/null

step "5. The back-end handles the request (waits up to 5 minutes)"
for _ in $(seq 1 100); do
  $TRACKER get-ticket DEMO-1 > "$WORK/ticket.json"
  if grep -q '"authorKind": "launcher"' "$WORK/ticket.json"; then break; fi
  sleep 3
done
check "the back-end answered" "grep -q '\"authorKind\": \"launcher\"' $WORK/ticket.json"
check "the mirror is changed" "grep -q dateLabel $WORK/backend/mirror/api/orders.js"

step "6. The front agent resumes its conversation and receives the answer and the back-end reply (F15)"
(cd "$WORK/front" && claude -p "Call listInbox on the tracker server (your token is in your context: pass it as the token argument). Confirm each item received with acknowledge. Then recordEntry DEMO-1 of type decision: the date only, without the time, following the developer's answer. Answer in one sentence with what the developer and the back-end said." \
  --resume "$SESSION" --mcp-config "$WORK/front/mcp.json" --strict-mcp-config --allowedTools "$TOOLS" --model haiku --output-format json < /dev/null > "$WORK/front-2.json")
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).result)' "$WORK/front-2.json"

step "7. The developer follows, delivers, validates and closes (F9, F10, F17, F19, F18)"
$TRACKER list-novelties > "$WORK/novelties.json"
$TRACKER list-tickets > "$WORK/tickets.json"
BATCH=$($TRACKER deliver-batch --name "Demo delivery" --keys DEMO-1 | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).id)')
$TRACKER validate-batch --batchId "$BATCH" > /dev/null
$TRACKER close-ticket DEMO-1 > "$WORK/closed.json"
$TRACKER get-ticket DEMO-1 > "$WORK/final.json"
$TRACKER usage-summary --period day > "$WORK/usage.json"
check "updates listed" "grep -q DEMO-1 $WORK/novelties.json"
check "answer acknowledged" "node -e 'const t=JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\"));process.exit(t.entries.some((e)=>e.entryType===\"answer\"&&e.acknowledgedAt)?0:1)' $WORK/final.json"
check "decision in the journal" "grep -q '\"entryType\": \"decision\"' $WORK/final.json"
check "ticket closed" "grep -q '\"closedAt\": \"20' $WORK/final.json"
check "back-end usage measured" "grep -q DEMO-1 $WORK/usage.json"

step "Final journal of DEMO-1"
node -e 'const t=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const e of t.entries)console.log("-",e.createdAt.slice(11,19),e.entryType.padEnd(15),(e.author??e.authorKind).padEnd(9),e.body.replace(/\n/g," ").slice(0,110))' "$WORK/final.json"
exit $FAILED
