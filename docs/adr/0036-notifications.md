# 0036. Notifications

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (sub-step 13c)
- Links: [features.md](../product/features.md) F26; [step 13 plan](../plan/etape-13.md)

## Context

F26: be told without keeping the page in front of you. V1 had a bell, a counter in the tab title and browser notifications.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. What notifies | One question for you; a ticket to declare done; a ticket without news; an answer from the back-end | **One question for you, one answer from the back-end** |
| 2. Form | **Tab title + browser notifications** (recommended); tab only; tab, browser and sound | Tab + browser |

## Decision

- **The tab title** carries the number of decisions waiting for you: "(3) project-tracker".
- **One browser notification** for each new question asked to you (by a front agent or by the back-end) and for each new answer reported by the launcher, **when the page is not in the foreground**. A click opens the ticket.
- The browser asks for permission after a click on "Activer les notifications" in the header; nothing is asked without this click.
- What already existed when the page opened does not notify: only what arrives afterwards.

## Consequences

- Everything happens in the page; the server does not change.
- A closed page notifies nothing: the counter and the "Nouveautés" screen take over when it is reopened.
