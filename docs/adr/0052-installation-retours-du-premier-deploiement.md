# 0052. Installation: feedback from the first real deployment

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (feedback and answers of 2026-10-21)
- Links: changes [ADR 0046](0046-installation-et-lancement-par-scripts.md) and [ADR 0050](0050-installer-et-lancer-en-une-commande.md); [step 23 plan](../plan/etape-23.md)

## Context

The user ran `install-front.sh` on their real project and gave six points:

1. "It asks for the Jira project key, but it must also ask for a parent ticket/epic."
2. "It lacks colour and spacing."
3. "Offer to run a load from Jira directly (do a pre-fetch to say how many tickets will be imported)."
4. "Have you planned something if the server is installed several times in several subfolders, for conflicts of published MCP?"
5. "There are warnings when the server starts, and the prompt never comes back: the server runs inline, not in the background. We should not see that."
6. "Once installed, give the URL to open the dashboard."

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Parent tickets | one optional parent key (recommended); several parent keys; free JQL | Several parent keys |
| 5. Controlling the background server | **`start-front.sh` + `stop-front.sh`** (recommended); one script with sub-commands | `start-front.sh` + `stop-front.sh` |
| 3. When to offer the Jira load | **on a new install** (recommended); on every install and update | On a new install |

Point 4 was checked with Claude Code 2.1 on nested projects: `.mcp.json` files are read up the parent folders and, for the same server name, the nearest project wins; `.claude/settings.json` (hooks, `TRACKER_URL`) is read only from the folder where Claude Code starts. Two nested installs therefore do not mix their MCP server or their hooks. The real conflict is the port: every new install took 9620.

## Decision

1. **Parent tickets**: the configuration takes `jira.parents`, a list of issue keys; when set, only their children assigned to the developer are loaded (`parent in (…)`). Keys are checked against the issue-key form, so nothing else reaches the JQL. The installer asks for them, comma-separated, empty for the whole project.
2. **Readable scripts**: headings, blank lines between parts, colours for questions, successes and warnings; no colour when the output is not a terminal or `NO_COLOR` is set.
3. **Jira pre-fetch**: a read-only operation counts what a load would bring (issues read, new ones) without writing. On a new install with Jira, once the server runs, the installer says how many tickets would be imported and offers to load them now.
4. **Free port**: a new install proposes the first port from 9620 that is free on this machine and not used by another project of the registry (ADR 0039).
5. **Background server**: `start-front.sh` starts the server in the background (log in `tools/tracker/server.log`, process id in `tools/tracker/server.pid`), waits until it answers, prints the dashboard URL and gives the prompt back; `stop-front.sh` stops it. An update stops the running server and starts the new one. Same for the back-end: `start-back.sh` and `stop-back.sh`, log in `launcher.log`. Node's start-up warnings are gone: the app folder declares its modules (`package.json` with `"type": "module"`), and the experimental-feature warning is turned off.
6. **Dashboard URL**: the last line of the install is the URL to open.

## Consequences

- `tools/tracker/.gitignore` also ignores `server.log` and `server.pid`.
- All the script output is in English (ADR 0053).
