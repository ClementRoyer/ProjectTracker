# 0038. Proposal for what's next

- Status: Accepted (criteria and display); the ranking rule is an AI proposal, to be adjusted by the user
- Date: 2026-10-20
- Decider: the user (sub-step 13e)
- Links: [features.md](../product/features.md) F21; [ADR 0032](0032-niveaux-de-priorite.md); [step 13 plan](../plan/etape-13.md)

## Context

F21: the tool suggests what to take up next. The user kept the four proposed criteria: almost done, priority, near due date, quick win. The last two need data that the tool does not have yet: a due date and a size.

## Decision

- **Due date** (`dueDate`): for a Jira ticket, read from Jira (field `duedate`, read-only) at each load; for a local ticket, set by the developer.
- **Size** (`size`): small, medium, large; set by an agent (at analysis) or by the developer, the last one to speak wins.
- **Display**: a box "À prendre ensuite" at the top of the list, collapsible, with at most three tickets and, for each one, its reasons.
- **Candidates**: open tickets on which nobody works and which wait for nobody; what waits for the developer is already in triage.
- **Ranking proposed by the AI** (points per reason, highest first; a ticket with no reason is not proposed):

| Reason | Points |
|---|---|
| Due date passed | 50 |
| Due in 2 days or less | 30 |
| Due in 7 days or less | 15 |
| Urgent / high priority | 40 / 20 |
| Almost done: in test or further | 20 |
| Quick win: small size | 15 |

## Consequences

- Migration 6 adds the due date and the size to the ticket.
- The ranking is a domain rule, tested; the `suggestNext` operation serves it to the page.
