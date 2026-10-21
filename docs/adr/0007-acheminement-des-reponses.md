# 0007. Routing the developer's answer to the agent

- Status: Accepted
- Date: 2026-10-18
- Decider: the user (answers to the three questions of 2026-10-18)
- Links: [features.md](../product/features.md) F14 (B5.3, B5.4, primary), F15; [ADR 0002](0002-perimetre-multi-agents-ouvert.md); check of the Claude Code documentation of 2026-10-18 (below)

## Context

The developer answers a question from the tool. The answer must **reach the agent that is waiting for it**, without the developer going through the conversation (B5.4). The developer must also **see that it has been taken into account** (B5.3).

Two cases arise:
1. **The conversation that asked the question is still open**: it must be "woken up".
2. **It is closed** (stopped, compacted, abandoned): the answer must wait for the next conversation that resumes the ticket (F15).

V1 handles case 1 with a "listening" conversation that watches a stream with the Monitor tool (restarted before 30 minutes) and passes the messages on to sub-agents. The mechanism works, but it is fragile and costly, and it is specific to Claude Code.

### What Claude Code allows (official documentation, checked on 2026-10-18)

| Mechanism | What it does | Limits |
|---|---|---|
| **Channel** (`claude/channel`) | An MCP server **pushes** a message into the open session; the model receives it on the next turn. | **Research preview.** You must start `claude --channels …`; a home-made local server requires `--dangerously-load-development-channels` (unless it is published as a plugin). Works in interactive mode only, with a claude.ai login or a Console key. Messages are lost if the channel is not loaded. |
| **Monitor** | Watches the output of a command; each line wakes the model. | 30 minutes at most (10 with `-p`), then it must be restarted: this is the V1 mechanism. |
| **`asyncRewake` hook** | A background hook wakes the model when it ends with exit code 2. | Maximum duration not documented (600 s by default); not meant for a long wait. |
| **Stop hook `block`** | Prevents the agent from stopping and gives it a reason to continue. | Waiting inside a hook is not a documented use. |
| **`claude -p --resume <id>`** | Adds a turn to a saved conversation, without interface. | If the conversation is open elsewhere, the messages get mixed up, with no lock. |
| **Classic MCP notification** | — | The model sees nothing without a tool call, unless there is a channel. |
| **Messaging between sessions** | Puts a text in between two tool calls. | The text is treated as coming from another session, not from the developer. |

None of this is guaranteed to exist in the same way in other agent tools (Codex, Cursor, OpenCode).

## Options considered

**A. All "pull" (neutral)**
The tool keeps the answer, and the agent fetches it itself:
- on each tool call: any tool response signals "une réponse t'attend";
- through a wait command that it calls when it has nothing left to do (bounded wait, which it can restart);
- when the ticket is resumed.

Advantages: works with any agent, loses nothing, no fragile mechanism. Drawback: an idle agent that is not waiting only sees the answer at the next contact.

**B. Push through a channel (Claude Code)**
The tool's server is also a channel. The answer is pushed into the conversation that asked the question, which receives it straight away.

Advantages: it is the real mechanism intended for this use, reception is immediate, and the user already uses a channel to reach the back-end. Drawbacks: research preview, mandatory launch option, interactive only, specific to Claude Code.

**C. Watch with Monitor (Claude Code, as in V1)**
The agent starts a watch that wakes it when an answer arrives.

Advantage: stable and documented mechanism. Drawback: mandatory restart every 30 minutes, which adds noise and costs.

**D. Resume the closed conversation (`--resume`)**
A local process automatically resumes the conversation with the answer.

Advantage: nothing stays pending. Drawbacks: the tool would have to run commands, which goes against the security principle "the page does nothing itself", and it is risky if the conversation is still open.

**E. Dispatcher (V1)**
A dedicated conversation receives all the answers and forwards them.

Advantage: already done. Drawbacks: it is the heaviest and most fragile mechanism of V1.

## AI proposal

Complementary layers rather than a single mechanism:

1. **Neutral base, always active (option A)**:
   - the answer is recorded, so it is never lost;
   - it is signalled in each tool response to the agent concerned;
   - a wait command is available;
   - it is handed over when the ticket is resumed.

   **Taking it into account is an explicit act of the agent** ("answer received"), visible to the developer.
2. **Claude Code accelerator: channel (option B)** when it is enabled, with **Monitor (option C) as fallback** if the channel is not available.
3. **Closed conversations**: the answer waits for the next conversation that takes the ticket; the tool shows it ("réponse en attente d'un intervenant"). Automatic resumption (option D) is set aside for now.
4. **The dispatcher (option E) is dropped** in favour of 1 and 2.

## Decision

The AI proposal is kept as it is. The user's answers:

| Question | Choice |
|---|---|
| Approach | "Yes, in layers": a neutral base, plus an accelerator for Claude Code |
| Waking an open Claude Code conversation | "Channel + Monitor as fallback" |
| Closed conversation | "It waits for a resumption" |

## Consequences

- The agent interface (MCP and CLI) systematically returns the answers waiting for the assignee, and offers a wait command.
- The Claude Code adapter contains a channel server and a Monitor fallback procedure.
- The evolution of channels will have to be followed, since they are a research preview.
