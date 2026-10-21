# 0055. The page's token travels outside the Authorization header

- Status: Accepted
- Date: 2026-10-21
- Decider: the AI, on the user's bug report of 2026-10-21 (a fix, no trade-off for the user to weigh)
- Links: completes [ADR 0027](0027-authentification-du-developpeur.md) (developer authentication)

## Context

The user works in a cloud IDE (SAP Business Application Studio) and opens the page through its port proxy (`port9500-<workspace>.<region>.applicationstudio.cloud.sap`). The page loaded, but every API call came back `401` with an empty body and `server: sap-business-application-studio`: the proxy keeps the `Authorization` header for its own login and refuses a bearer token it does not know, before the request reaches the tool. The `Host` check of the tool was not in the way: the proxy rewrites it to the local address.

## Decision

1. **The page sends its token in `X-Tracker-Token`**, a header proxies pass through untouched.
2. **The server takes a token from `Authorization: Bearer …` or from `X-Tracker-Token`.** The CLI, agents and the launcher keep `Authorization`: they talk to the server directly.
3. Nothing else changes: the token is the same developer token (ADR 0027), and a third-party site still cannot send a custom header to the server without a CORS permission the server never gives.

## Consequences

- Reaching the tool through a cloud IDE's port proxy relies on that IDE's own login: only the workspace owner reaches the port. The tool itself still listens on the loopback only.
