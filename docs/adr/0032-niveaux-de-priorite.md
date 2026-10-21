# 0032. Priority levels of a ticket

- Status: Accepted
- Date: 2026-10-20
- Decider: the user
- Links: [ADR 0021](0021-suites-du-poc-reseau-et-lanceur.md) (priority breaks ties between back-end requests), [0024](0024-migration-des-donnees-v1.md) (V1 priority set aside for now), [0028](0028-page-svelte.md); [glossary](../product/glossary.md) `priority`

## Context

ADR 0021 created the ticket's priority, set by the developer: when several back-end requests wait for the same held file, the one of the highest-priority ticket goes first. The levels and the default value remained to be set, as well as the taking over of the priorities the tool already knows (Jira, V1) and their place in the page.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Levels | 3: high, normal, low (recommended); **4: urgent, high, normal, low**; 5, like Jira | 4 levels (user's choice against the recommendation) |
| 2. Ticket loaded from Jira | **Taken over at creation** (recommended); always follow Jira; ignore Jira | Taken over at creation |
| 3. Priority of V1 tickets | **Converted at migration** (recommended); not taken over | Converted |
| 4. Place in the page | **Discreet, unless set away from "normal"** (recommended); always visible | Discreet |

## Decision

- **Four levels**, from the most to the least priority: urgent (`urgent`), high (`high`), normal (`normal`), low (`low`). **Default: normal.**
- **Jira**: at the first loading of a ticket, its Jira priority gives the starting value; after that it belongs only to the developer, and a later loading never overwrites it. Nothing is written to Jira.
- **V1**: the migration converts the V1 priority; a V1 ticket with no priority takes "normal".
- **Conversion of the five-level scale** of Jira and V1, proposed by the AI: Highest → urgent; High → high; Medium → normal; Low and Lowest → low; an unknown name (custom Jira priority) → normal.
- **Page**: a mark on the row and the card when the priority is not "normal", a "Priorité" sort in the list, a choice in the ticket header to change it. Each change is noted in the journal.
- **Back-end requests** (ADR 0021): when a held file is released, the request of the highest-priority ticket goes first; at equal priority, the oldest.

## Consequences

- Database migration: a `priority` column on `ticket`, "normal" for existing tickets.
- A `setPriority` operation reserved for the developer; agents see the priority in the ticket summary.
- The Jira client also reads the `priority` field (read-only).
