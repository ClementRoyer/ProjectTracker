# 0021. Follow-ups of the POC, part B: network without TUN, retry of blocked requests, guard rail in parallel

- Status: Accepted
- Date: 2026-10-19
- Decider: the user ("Mode without TUN. Yes, retry automatically if locked when the lock is finished. Have a priority"; then the choices "Waiting queue for a file" and "Report on all")
- Links: [report of POC B](../analysis/2026-10-19-poc-connexion-b/README.md); completes [ADR 0010](0010-back-end-intervenant-du-ticket.md)

## Context

POC B confirmed the launcher and the locks (R6), but three points of ADR 0010 turned out to be incomplete:

1. **Network.** The developer's machine is a container without `/dev/net/tun`, and TUN cannot be enabled there. Tailscale then runs in userspace mode:
   - there is no private network interface, so the tool cannot listen "on the private network interface" as ADR 0010 foresees;
   - connections coming from the private network are delivered on the loopback;
   - a local program reaches the private network only through the proxy of `tailscaled`.
2. **Held file.** A back-end agent that finds its file held by another ticket stops in `blocked`, and nothing retries the request.
3. **Guard rail.** When several executions run at the same time in the mirror, an undeclared change cannot be attributed to one of them.

## Options considered

| Point | Options | Choice |
|---|---|---|
| 1. Network without TUN | Enable TUN (impossible here); userspace mode with a Headscale access rule | Userspace mode |
| 2. Held file | Manual retry; automatic retry when released | Automatic retry |
| 2b. Several requests wait for the same file | Order of arrival; priority | Priority, then order of arrival |
| 3. Guard rail in parallel | Report on all running tickets; one execution at a time; attribute by priority | Report on all |

## Decision

### 1. Mode without TUN accepted

- When TUN is not available, Tailscale runs in **userspace mode** on the machine concerned.
- The tool listens **on the loopback only**; Tailscale delivers the private network connections there.
- **Condition: a Headscale access rule (ACL).** Only the back-end server (and a developer's device, if they want) can reach the developer's machine, **and only on the tool's port**. Without it, all the local services of the machine would be exposed to the private network.
- The launcher can go through an **HTTP proxy** (that of `tailscaled`), set in its configuration.
- The tool is still **never exposed on the Internet**, and the connections always start from the back-end server.

### 2. Automatic retry of requests blocked by a held file

- When the agent reports that a file is held, the request goes to **"waiting: file held by <ticket>"**. It is not in failure.
- **When the file is released, the launcher retries the request** without intervention: it resumes the agent's conversation if the agent tool knows how to do it, otherwise it starts a new agent.
- **Several requests wait for the same file**: the request whose **ticket has the highest priority** goes first; at equal priority, the oldest.
- The **ticket priority** is a new notion, set by the developer.

### 3. Guard rail with several executions in parallel

- An undeclared change noticed while several executions are running is **reported on each of the running tickets**, with the mention **"uncertain author"**. The developer decides.
- With a single running execution, the report stays the one of ADR 0010.

## Consequences

- The glossary gains the ticket's **priority** (`priority`), and the data model (ADR 0015) a `priority` field on `ticket`.
- Details left to the launcher step, to be submitted to the developer at that time: the priority levels, and the default value.
- The installation will describe the Headscale access rule to set, and the proxy configuration when TUN is missing.
- Still to check on the real back-end server: passing through the company network (R5), the launcher between two machines (R6) and the cost of a worktree (R7).
