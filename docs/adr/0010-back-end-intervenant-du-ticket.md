# 0010. The back-end, an assignee of the ticket, launched on its server

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (design built with him, reviewed and accepted on 2026-10-19: "Yes, that's fine with me")
- Links: [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostic), [0007](0007-acheminement-des-reponses.md) (routing), [0008](0008-eviter-les-conflits-entre-tickets.md) (conflicts); [features.md](../product/features.md) F6, F7, F14, F16, F33; [needs.md](../product/needs.md) M7; [architecture.md](../architecture.md) §2.1

## Context

Today, the back-end is **a single Claude Code conversation**, started by hand on the back-end server. The front agents reach it through Anthropic's relay (sessions with remote-control). The user describes the problem this way:

> "When several agents send a message to the back-end, the context becomes confused for it, or overloaded. It answers one message with several tickets in the answer, and does not take advantage of creating several unique sessions."

His idea:

> "The back-end should perhaps be a second agent connected to the ticket and handled in the same way as the front agents (instantiated when needed)."

### Constraints agreed with the user (2026-10-19)

| # | Constraint | The user's words |
|---|---|---|
| K1 | The back-end code only exists on his server. It is not a git repository, but a mirror of the deployed server. | "This is not a git repository but a mirror of the deployed back-end server."; "The code only exists there." |
| K2 | The back-end server is used only by the developer. | "It is only for me." |
| K3 | The developer brings the changes of the mirror to the deployed server himself. He does not need the tool to track these changes. | "It's me who takes the changes from the mirror to the server."; "No need to know about the back-end changes." |
| K4 | No reliable SSH between the machines. The only common access is outgoing HTTPS over the Internet. | "Sometimes company networks prevent it." |
| K5 | No hosted tool with remote clients: too heavy to deploy. | "I'm afraid that going with a deployed server and clients connecting to it would make the solution much heavier." |
| K6 | The solution must work with any agent tool (ADR 0002). | "It is not agnostic to the type of AI agent." |
| K7 | The back-end must really improve. | "There is no improvement for the back-end." |
| K8 | Network intermediary accepted: a private, encrypted, self-hosted network. | "Private encrypted network"; "For Tailscale, we'll self-host it with the community solution." |

## Options set aside

| Option | Reason for setting it aside |
|---|---|
| A single, better-disciplined back-end | The context remains shared between the tickets: this is the observed problem (K7). |
| A back-end agent connected through an SSH tunnel | No reliable SSH (K4). |
| The tool hosted on a common server | Too heavy (K5). |
| Anthropic's relay with a "relay" back-end session and sub-agents | Specific to Claude Code (K6), with no real improvement (K7). |
| One copy of the mirror per ticket | Proposed by the AI; the user preferred to work directly in the mirror with held files. |
| File locks managed by the tool, across the network | The user proposed local `.lock` files: simpler, and they work even if his machine is switched off. |

## Decision

### 1. The back-end is an assignee of the ticket

- **A ticket has one assignee per role**: `front` and `back-end`.
- The exchanges between the two are **journal entries** of the ticket, kept word for word and routed according to ADR 0007.
- The back-end is no longer a "partner". F33 ("tooled exchanges with the back-end") becomes messaging between the assignees of the same ticket.

### 2. Network: a private, encrypted, self-hosted network (K4, K5, K8)

- Both machines join a private **Headscale** network: the self-hosted community coordination server, used with Tailscale clients. This server must be reachable over HTTPS by both machines. Traffic between the machines is encrypted end to end.
- **The tool remains unique and local**, on the developer's machine. It listens on the loopback interface and on the private network interface, **never on the Internet**.
- The back-end server reaches the tool through this network. Connections always start from the back-end server.

### 3. The launcher (K6, K7)

A **launcher** is a small program of the tool, installed on the back-end server and started once by hand by the developer.

- It **picks up pending back-end requests** from the tool and sends **signs of life** ("lanceur en ligne").
- For each request, it starts a **new agent** with a **configurable command**: `claude -p …`, `codex exec …`, `opencode run …`.
- The launch text (ticket record, request, rules) is provided by the tool and passed to the agent **through a file**, never on the command line.
- **Resuming an exchange**: if the agent tool can resume a conversation, the launcher uses the configured **resume command**. Otherwise, it starts a new agent, which rereads the record; the record already contains the previous exchanges.
- **Configurable limits**: only one back-end agent at a time per ticket, at most N agents in parallel (for example 3), a maximum duration per execution.

### 4. Path of a back-end request

1. The front agent, or the developer, creates a **back-end request** on the ticket. The text is kept as it is in the journal, and the ticket shows **"attente : back-end"**.
2. The launcher picks up the request and **takes it on** on behalf of the ticket's back-end role.
3. It starts the agent. The agent reads the record and the request, then works in the mirror. It can also ask the developer a question, like any assignee.
4. The agent **answers through the tool** (MCP or CLI). The answer enters the journal, word for word.
5. The front agent receives it according to ADR 0007.

### 5. Held files in the mirror: local locks (proposed by the user)

- **Before changing a file of the mirror, the agent declares it** by means of a small local command of the launcher, usable by any agent.
- The locks are **`.lock` files created atomically**: only one agent can succeed in creating a given lock. Each lock indicates the ticket and the execution holding the file. The locks **live outside the mirror**, in the launcher's folder, so that they never travel to the deployed server.
- **File already held**: the command indicates by which ticket. The agent waits or does something else. The tool shows **"attente : fichier tenu par <ticket>"**, information passed on by the launcher's signs of life, for information only.
- **The launcher removes an execution's locks as soon as it ends**, normally or not. As it is the parent of each agent, no lock stays orphaned.
- This mechanism **works even if the developer's machine is switched off**.
- **Safeguard**: at the end of an execution, the launcher checks that no file of the mirror has been changed without being declared. Otherwise, it reports "modification non déclarée" on the ticket. **The tool does not record any content or history of back-end changes** (K3).

### 6. Security

- The tool can only be reached from the developer's machine and the private network.
- **The launcher has its own token**, limited to the back-end role: picking up requests, writing to the journal of the tickets concerned, sending signs of life. The page keeps its anti-forgery token.
- **The tool only sends text, never commands.** The launcher only runs the command configured by the developer on the back-end server.
- **The back-end code does not leave its server.** Only the messages written by the agents travel.

### 7. Failures

| Failure | Behaviour |
|---|---|
| Developer's machine switched off, or network cut | The launcher retries at increasing intervals. Requests wait, nothing is lost. Local locks keep working. |
| Launcher stopped | The page shows "lanceur back-end hors ligne". Requests wait for it to restart. |
| Agent crashed or exceeding the maximum duration | The launcher stops it, records it in the journal and releases its locks. The request is marked as failed, to be restarted by the front or the developer. |
| Loss of contact with the launcher during an execution | The tool marks the request "en cours, lanceur injoignable". The launcher picks it up again or closes it when it returns. |

### 8. Tests

- The launcher is tested with **a fake agent**: a dummy command that reads its launch text, declares files and answers.
- The tests use generic sample data. They cover concurrent locks, an agent failure and a network cut.

## Consequences

- **Glossary**:
  - new terms: role, launcher, execution, back-end request;
  - the assignee becomes "one per role";
  - the partner no longer refers to the back-end.
- **Architecture**: the tool serves its API and the MCP over HTTP, also for remote agents. The launcher is a new component, delivered with the tool.
- **Installation**: in addition to the local tool, a light installation of the launcher on the back-end server, and the setup of Headscale, which is done outside the tool.
- **Risks to check through a trial**:
  - does the company network let Headscale and Tailscale through?
  - does the non-interactive mode of each agent tool (launch and resume) work?
