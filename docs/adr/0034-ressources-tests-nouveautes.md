# 0034. Shared resources, test runs, novelties screen

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (launch of step 12)
- Links: [ADR 0008](0008-eviter-les-conflits-entre-tickets.md) (part 2: shared resources); [features.md](../product/features.md) F9, F16, F17; [step 12 plan](../plan/etape-12.md)

## Context

Three primary features remain incomplete after steps 9 to 11: the lock on shared resources (F16), the result of a ticket's tests (F17) and "what changed since my last visit" (F9), whose operation exists without a screen. ADR 0008 sets the principle of the lock (`tracker resource run e2e -- <command>`, a visible "ressource" wait) but not its duration nor the list of resources.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Resources known to the tool | **Declared in the configuration** (recommended); created on first use | Declared |
| 2. Release after a sudden stop | **Renewed lease**: 60 s, renewed every 20 s (recommended); fixed maximum duration | Renewed lease |
| 3. Novelties in the page | **"Nouveautés" screen** (recommended); panel on the list; the blue dots are enough | Screen |

## Decision

1. **Resources are declared** in the project configuration (`resources`, for example `["e2e"]`). An unknown name is refused.
2. **Lock with a renewed lease.** `tracker resource run <resource> --key <ticket> -- <command>` requests the resource for the ticket, waits its turn in the queue (the ticket then shows the "ressource" wait), runs the command **on the agent's machine**, renews the lease every 20 s, then releases the resource and exits with the command's code. Without renewal for 60 s, the lock drops and the next in the queue goes. The server never runs the command. Taking and releasing are noted in the ticket's journal.
3. **Test runs**: agents (and the developer) record a run, automatic, visual or user, passed or failed, with a note; the ticket record shows the latest one.
4. **"Nouveautés" screen**: a link in the header with their count; the screen groups them by ticket, each one opens its ticket; "Tout marquer vu" clears them.

## Consequences

- New operations: request, renewal and release of a resource; recording of a test run.
- A resource's queue follows arrival order.
- The "Nouveautés" dot of each ticket (ADR 0029) and the screen each have their own visit date: reading a ticket does not clear the screen, and the reverse.
