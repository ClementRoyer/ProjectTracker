# 0006. Code in English, interface and documents in French

- Status: Superseded by [ADR 0053](0053-tout-en-anglais.md)
- Date: 2026-10-18
- Decider: the user (answer "yes" to question 1 of the [glossary](../product/glossary.md))
- Links: [tooling audit](../analysis/2026-10-16-audit-v1/tooling.md) §4, [glossary](../product/glossary.md)

## Context

In V1, the languages are mixed: contracts in English, architecture and decisions in French, and domain terms sometimes in English, sometimes in French. The V2 glossary sets one word per notion, which forces a choice of language for each use.

## Options considered

1. **Everything in English**: the common practice for code, but the developer works in French.
2. **Everything in French**, including the code: accented or approximate identifiers, and a gap with the ecosystem.
3. **Code in English; interface and documents in French**: each term of the glossary has a French name and an English code name.

## Decision

**Option 3.** The code (identifiers, schemas, commit messages) is in English. The project documents and the interface are in French. English remains available as a second interface language (F27).

## Consequences

- The glossary is the lookup table between the French term and the name in the code.
- Interface texts go through the translation files, with French as the default language.
- The V2 technical contracts (data, interfaces) are written in French, with the code names in English.
