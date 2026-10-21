# 0056. No ticket for a Jira issue already done

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (answer of 2026-10-21)
- Links: completes [ADR 0026](0026-operations-cli-configuration-jira.md) (loading from Jira) and [ADR 0052](0052-installation-retours-du-premier-deploiement.md) (parent tickets, pre-fetch)

## Context

The first real load counted 104 issues assigned to the user in their Jira project, many of them already finished. Loading took every assigned issue, whatever its status.

The user: "No, issues already done must not be taken up."

## Decision

1. **An issue whose Jira status category is Done is never created** as a ticket. The category is used, not the status name, so that "Done", "Closed", "Resolved" or a custom name are all covered.
2. **A ticket already tracked keeps being followed**: when its issue becomes done in Jira, the load still records the new status in its journal.
3. **The pre-fetch count** (`previewJiraLoad`) leaves done issues out of the new ones; the number read still counts every assigned issue.

## Consequences

- The filter is applied by the tool after reading, not in the Jira query: a tracked ticket whose issue gets done must still be read to be updated.
