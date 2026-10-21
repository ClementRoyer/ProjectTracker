# 0033. Priority orders all back-end requests

- Status: Accepted
- Date: 2026-10-20
- Decider: the user ("ok for all the requests")
- Links: completes [ADR 0021](0021-suites-du-poc-reseau-et-lanceur.md) and [ADR 0032](0032-niveaux-de-priorite.md)

## Context

ADR 0021 only applied priority when several back-end requests were waiting for the same held file. While writing it (ADR 0032), the AI applied the same order to all pending requests, and submitted it to the user.

## Options considered

| Option | Effect |
|---|---|
| **All requests** (proposed) | The launcher always takes the request of the most urgent ticket, then the oldest |
| Only when the held file is freed | Arrival order, except between requests that were waiting for the same file |

## Decision

**All pending requests** are taken by ticket priority, then by age. A new request from an urgent ticket goes ahead of older requests from normal tickets.

## Consequences

- One single ordering rule for the launcher, already in place.
- A low-priority ticket can wait a long time if other requests keep arriving; the developer sees it in the displayed wait and can raise its priority.
