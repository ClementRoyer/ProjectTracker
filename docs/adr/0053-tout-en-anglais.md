# 0053. Everything in English

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message and answer of 2026-10-21)
- Links: supersedes [ADR 0006](0006-langues.md) and the interface part of [ADR 0048](0048-documentation-en-anglais.md); [step 24 plan](../plan/etape-24.md)

## Context

After the first real deployment, the user: "Also, it's in French!! It should be in English." Asked how far to go (the terminal only, the page too, or the scripts only), they chose "Everything, the page included".

## Decision

1. **The whole product speaks English**: the page, the CLI, the server's messages, the installer and the launcher, the instructions and tool descriptions given to agents, the journal entries the tool writes. Dates are shown in the `en-GB` form (day, month, 24-hour clock).
2. **The glossary's English term is also the interface term**: its "French (UI)" column goes.
3. **Data already written stays as it is**: journal entries recorded in French remain French.
4. **Conversations with the user stay in French**, as before.

## Consequences

- ADR 0006 is superseded: code, commit messages, documents and interface in English.
- A French interface would come back as a translation (F27), not as the default.
