# 0029. Follow-ups of the page: folder, novelties, currency, delivery

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (open points of step 10, after the demo of the page)
- Links: [plan of step 10](../plan/etape-10.md); [ADR 0012](0012-mesure-de-l-usage-ia.md), [0015](0015-modele-de-donnees.md), [0028](0028-page-svelte.md); [features.md](../product/features.md) F9, F19, F20

## Context

The page was written from the validated mockup. Four points had no answer in the mockup or in the data model; they were submitted to the user after he validated the page.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Sections "Fait", "Reste", "Pièges" of the folder, with no data | Add them to the journal, reported by the agent (recommended); remove them | **Remove them** |
| 2. Clearing the novelties mark | Ticket by ticket, on opening (recommended); a "tout marquer lu" button | Ticket by ticket |
| 3. Currency of the estimated cost | A key in the configuration (recommended); no currency | Currency in the configuration |
| 4. Tickets proposed for the next QA delivery | Phase "Test" with progress "fait" (proposed by the AI); all tickets in "Test" | Phase "Test", progress "fait" |

## Decision

1. **The folder shows only what the model knows**: initial request, where things stand, decisions, last test run, shared files, Jira link. The sections of the mockup are removed (choice of the user against the AI recommendation).
2. **Novelties ticket by ticket.** Opening a ticket clears its mark, and only its own. The database keeps a last-read date per ticket; the list of novelties (F9) keeps its own visit date.
3. **Currency in the configuration**: a key `currency` (ISO 4217 code, for example `USD` or `EUR`) next to the price table. The page shows the cost in this currency; without the key, it shows it without a symbol.
4. **Next delivery**: the open tickets in phase "Test" whose progress is "fait".

## Consequences

- Database migration 3: a read table per ticket.
- A `markTicketRead` operation (developer), called by the page when a ticket is opened and when new entries arrive there while it is open.
- `usageSummary` returns the configured currency.
