# Product understanding

- Status: **Validated** (2026-10-19)
- Version: 2 (2026-10-18), corrected after the user's remark
- Sources: `README.md`, `SKILL.md`, `references/review-2026-10-12.md`, [V1 audit](../analysis/2026-10-16-audit-v1/README.md)

This document restates why project-tracker exists and what it must do. It frames the needs ([needs.md](needs.md)). Once validated, it becomes the reference for the "what".

## The user's correction (2026-10-18)

Version 1 of this document put **AI agents** at the centre. The user corrected it:

> "The initial purpose of the project is not [that one]. The genesis is to manage several tickets on a project, to be able to work on several tickets at the same time, and the difficulty is to track where each ticket stands, and to review the ticket's information."

The centre of the product is therefore **the ticket**. Agents are a means of handling tickets, not the subject.

## 1. The problem

On a project, the developer has **several tickets to handle, and handles them at the same time**. This parallelism is made possible by AI agents. The difficulty:

- **Knowing where each ticket stands**: which step it is at, what has been done, what remains, what blocks it, whether it waits for something from the developer.
- **Reviewing a ticket's information**: coming back to a ticket after working on others, finding everything about it in one place. This includes the description, the context, the decisions, the questions and answers, the exchanges, the tests and the files touched.

Without a tool, this information is scattered across the conversations, the developer's memory and the ticket tool. The more tickets in parallel, the more the thread is lost.

## 2. The answer

project-tracker is **the tracking record of each ticket, plus an overview of all the tickets in progress**:

- **Overview**: all the project's tickets, their step, and at a glance those moving forward, those blocked and those waiting for the developer.
- **Ticket sheet**: everything about a ticket, up to date, in one place, readable enough to pick up the thread.
- **Feeding**: those who work on the ticket, most often AI agents, keep the sheet up to date as they go. The developer does not have to fill it in.

## 3. Principles

- **The ticket is the central unit**: everything attaches to a ticket.
- **Where a ticket stands must be visible without searching.**
- **Nothing is summarized or truncated** in the sheet: what was said or exchanged stays intact.
- **The developer does not fill in the tracking by hand**: those who do the work feed it.
- **Everything stays local**, and the tool is generic, with no client name.

## 4. Decisions already made

- [ADR 0002](../adr/0002-perimetre-multi-agents-ouvert.md): several kinds of agents can feed the tracking, not only Claude Code.
- [ADR 0003](../adr/0003-build-a-la-release.md), [0004](../adr/0004-stockage-sqlite.md), [0005](../adr/0005-frontend-svelte.md): technical choices, with no effect on the "what".

## 5. The user's clarifications (2026-10-18)

| Question | User's answer | Consequence for the product |
|---|---|---|
| One agent per ticket? | "Sometimes I do some tickets myself, sometimes an agent has to handle several, sometimes one." | The link between a ticket and whoever handles it is free. An agent can carry several tickets, and **the developer is an assignee too**: they must be able to move a ticket forward from the page (step, note), like an agent. |
| Where do tickets come from? | "Both are possible. Some tickets come from Jira (e.g. a bug in QA or in production, a feature request), sometimes it comes from me asking (e.g. a bug found during testing, a feature idea, an invisible improvement)." | Two origins: **imported** from a ticket tool (with its key and link) or **created locally**. A local ticket must be easy to create, by the developer or by an agent at their request. |
| Several projects? | "95% of the time it will be one project, but from time to time maybe several (several would be a bonus)." | **One project is the normal case**. Multi-project is a secondary feature, and the design must not make it impossible. |
