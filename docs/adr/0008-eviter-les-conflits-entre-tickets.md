# 0008. Avoiding conflicts between tickets handled in parallel

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the questions of 2026-10-19)
- Links: [features.md](../product/features.md) F16 (B4.4, primary), F34 (secondary); [needs.md](../product/needs.md) M4; [glossary](../product/glossary.md) (held file, shared resource, lock, conflict, guard)

## Context

The user's words (M4): conflicts happen "very, very often". Today, he avoids them by not changing the code of several tickets at the same time. The new tool must make this parallelism possible.

The problem has two parts.
1. **The code**: two assignees change the same files. In the same folder, they also share the state of git: uncommitted changes, current branch, a build broken by one and suffered by the other.
2. **The shared resources**: an environment that only one ticket can use at a time, for example the e2e tests.

V1 handles code through **held files** (declared before a change, with a hook guard that refuses the write), and resources through a **lock** (`lock run … -- <command>`). Both apply in **one single shared working folder**. The guard relies on regular expressions over shell commands (known false positives) and on a hook specific to Claude Code. Liveness is detected by process number.

## Part 1: the code

### Options

**A. One working folder per ticket (git worktree)**

Each ticket has its own branch and its own folder. The assignees do not see each other: no shared files, git state or build. Conflicts only appear when the branches are merged, as ordinary git conflicts.

- Advantages:
  - total isolation, whatever the agent tool;
  - the common practice for having several agents work in parallel;
  - Claude Code already knows how to work in a worktree (dedicated tool, sub-agent isolation).
- Drawbacks:
  - each folder must be installed (dependencies, environment files);
  - development servers need different ports;
  - the branches must be merged before delivery;
  - a conflict is found late if it is not detected earlier.

**B. One folder and held files (V1)**

- Advantages: no duplication, and exclusivity is guaranteed in real time.
- Drawbacks:
  - depends on the discipline of the agents and on a guard specific to Claude Code;
  - the git state and the build remain shared;
  - two tickets that touch the same file cannot move forward together.

**C. One folder per ticket, with early detection of overlaps** (A enriched)

On top of A, the tool regularly compares the files changed by each ticket, by reading git in each folder. It immediately signals that two tickets touch the same file. The developer then sees a risk of conflict, not a block. Held files remain possible, as a voluntary lock on a sensitive file (F34).

### AI proposal

**Option C.**

## Part 2: the shared resources

### Options

**R1. Lock managed by the tool, with a queue**

- The assignee requests the resource, uses it, then releases it. A wrapper command holds the lock for the whole execution: `tracker resource run e2e -- <command>`.
- The lock is stored in the database (ADR 0004), with a validity period renewed by signs of life, instead of the process number.
- Who is waiting appears in the situation of the ticket: **"attente : ressource « e2e »"**.
- Advantage: neutral with respect to the agent tool.

**R2. R1 plus a Claude Code guard**

A hook refuses an e2e command started outside the wrapper command. This catches an undisciplined agent, but it reuses the V1 regular-expression guard, which is fragile and specific to Claude Code.

**R3. Nothing special**: we stay in the current situation.

### AI proposal

**R1**, with the guard from R2 as an **option** (F34, secondary), disabled by default.

## Resources specific to each folder (to explore)

With one folder per ticket, some resources must be **distinct per ticket** rather than exclusive: the development server port, a local database. The tool could assign a port to each ticket. This must be confirmed according to the project.

## Decision

| Question | User's answer |
|---|---|
| Git organisation of a ticket today | "Varies" (one branch per ticket or a shared branch, depending on the case) |
| Approach for the code | "Worktree + detection" (option C) |
| Approach for shared resources | "Lock + queue" (R1, Claude Code guard as an option disabled by default) |
| Installing a new working folder on the project | "I don't know" |

Adjustments that follow from these answers:
- **The folder per ticket is the recommended mode, not an obligation.** As the git organisation varies, a ticket can also be handled in the main folder. In that case, overlap detection applies between the tickets that share this folder, and held files (F34) remain available.
- **Preparing a working folder is configurable per project**: a preparation command (install the dependencies, copy the environment files, choose a port), started by the assignee, never by the page.
- **Risk to clear before building**: the real cost of preparing a folder on the user's project is unknown. A trial will be run at the start of the "agent interfaces" step of the plan.

## Consequences

- The ticket knows its **branch** and its **working folder**, if it has one. Resumption (F15) takes place in this folder.
- The tool reads git in each folder for overlap detection. This also serves F23 (code changes of the ticket).
- QA delivery (F19) includes merging the branches of the tickets in the batch.
- The glossary gains two terms: **working folder** (`worktree`) and **overlap** (`overlap`), a detected risk of conflict.
