# 0022. Domain rules confirmed

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (answers to the five questions of 2026-10-19)
- Links: `packages/core/src/domain/`; completes [ADR 0012](0012-mesure-de-l-usage-ia.md) (usage) and [ADR 0015](0015-modele-de-donnees.md) (model)

## Context

At step 7, the AI wrote `core/domain` by deciding alone five rules that the product documents did not set. They had to be confirmed by the user.

## Options considered

| Rule | AI interpretation (coded) | Other options presented |
|---|---|---|
| 1. Displayed wait | The developer first, otherwise the oldest wait | The oldest; all displayed waits |
| 2. "Without news" | Only an "in progress" ticket that is not closed | Any open ticket |
| 3. Change of phase | Going back allowed; changing phase resets the progress to "not started" | Forward only; going back with the progress kept |
| 4. Closing | By the developer, only after a QA validation "done" | At any time by the developer; early with a reason |
| 5. Usage periods | UTC, ISO weeks | Local time, week starting Monday (recommended) |

## Decision

- **Rules 1 to 4: confirmed** as they are coded.
- **Rule 5: local time.** The days, weeks and months of usage follow the **developer's time zone** (midnight at their place), and the week runs from Monday to Sunday (ISO numbering).

## Consequences

- `periodKey` and `summarizeUsage` receive the time zone (IANA name, for example `Europe/Paris`): the domain stays pure, without reading the environment.
- The time zone comes from the tool's configuration. If it does not give it, it is the time zone of the machine.
- Instants stay recorded in UTC; only the grouping by period depends on the time zone.
