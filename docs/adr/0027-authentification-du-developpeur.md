# 0027. Authentication of the developer with the server

- Status: Accepted
- Date: 2026-10-19
- Decider: the user (question of 2026-10-19, at the start of step 9c)
- Links: [ADR 0011](0011-interface-des-agents.md) (agent tokens), [0010](0010-back-end-intervenant-du-ticket.md) (launcher token), [0021](0021-suites-du-poc-reseau-et-lanceur.md) (mode without TUN), [0026](0026-operations-cli-configuration-jira.md)

## Context

The agents have a conversation token (ADR 0011) and the launcher has its own (ADR 0010). The developer, the only one allowed to close a ticket, answer questions or record a delivery, must be recognised. In mode without TUN (ADR 0021), the connections of the private network arrive on the loopback: the origin address is not enough.

## Options considered

| Option | Advantages | Drawbacks |
|---|---|---|
| **Token in a local file**, renewed at each start (recommended) | Nothing to configure; nothing lingers from one start to the next | The file must be read: the CLI does it by itself |
| Fixed token in an environment variable | Stable | To manage, and never to commit |
| No developer token | The simplest | A device of the private network could act in the name of the developer |

## Decision

**Token in a local file.**

- At startup, the server draws a random token and writes it to `developer.token`, next to the database, readable by the user alone (rights 600) and ignored by git. A new token replaces the old one at each start.
- The page receives the token in the HTML it loads; the developer's CLI reads it from the file.
- Every request carries a token (`Authorization: Bearer …`): developer, agent conversation or launcher. Without a valid token, only the introduction of an agent (`introduce`) is accepted, so that a new conversation gets its own.
- The server also refuses a request whose `Host` header is not one of its listening addresses (protection against "DNS rebinding").

## Consequences

- The operations reserved for the developer (closing, answers, deliveries) are accessible only with this token.
- `introduce` stays open: on the private network, the Headscale access rule (ADR 0021) limits who can reach the server.
- An agent running on the developer's machine could read the file: the token protects against the network, not against the developer's own programs.
