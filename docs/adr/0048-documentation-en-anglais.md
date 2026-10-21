# 0048. Documentation in English

- Status: Accepted
- Date: 2026-10-21
- Decider: the user (message and answers of 2026-10-21)
- Links: partly supersedes [ADR 0006](0006-langues.md) (languages) for the documents; follows [ADR 0045](0045-projet-open-source-readme-en-anglais.md) (open-source project, README in English)

## Context

The user (2026-10-21): "Problem: the documents are all in French. How do we switch everything to English easily?"

The project is now open-source (ADR 0045) and published (ADR 0047). Its README is in English, but every other document (decisions, product, architecture, plan) is in French, which shuts most contributors out.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Scope | public documents only (recommended); all the documentation | All the documentation |
| 2. Afterwards | **public documents written in English** (recommended); French, translated at each version | Public documents written in English |
| 3. The user's quotes in ADRs | translated, original kept (recommended); translated only; left in French | Translated only |
| 4. Translators | Sonnet 5.5 (recommended); Haiku 5.5 | Haiku 5.5, with a review pass |

## Decision

1. **All the documentation under `docs/` is translated into English once**, by Haiku 5.5 sub-agents sharing one lexicon, then reviewed. The user's quotes are translated; the French originals stay in the private git history.
2. **From now on, documents are written in English**: ADRs, product, architecture, code style, plan. Conversations with the user stay in French.
3. **The interface stays in French** (ADR 0006): labels and messages quoted from it keep their French wording. The glossary keeps the French interface term next to the English term and the code name.
4. **File names do not change**, so that links and history stay intact.
5. **Accepted ADRs are translated, not rewritten**: the meaning of each decision is unchanged. This is the only exception to the rule that an accepted ADR is never modified.

## Consequences

- ADR 0006 is partly superseded: code and commit messages in English, interface in French, documents in English.
- `AGENTS.md` and `docs/README.md` state the new rule.
