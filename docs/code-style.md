# Code style guide

- Status: Accepted ([ADR 0019](adr/0019-regles-de-code.md))
- Sources: [Google's TypeScript guide](https://google.github.io/styleguide/tsguide.html), the style guide of V1 (`legacy/references/code-style.md`) and the lessons of its [audit](analysis/2026-10-16-audit-v1/README.md).

This guide contains only what a tool does not check. The rules checked by ESLint are listed at the end: we do not repeat them in the code as comments, we follow them.

## 1. Name with the glossary

The domain concepts carry the name of the `Code` column of the [glossary](product/glossary.md). Never a synonym.

```ts
// ✗ item, card, owner, blockedBy
// ✓ ticket, assignee, wait
interface ActiveAssignment { ticketId: string; role: Role; assignee: Assignee }
```

- A function starts with a verb: `computeWait`, `closeTicket`, `findOverlaps`.
- A boolean reads like a question: `isStale`, `hasOpenQuestion`, `canClose`.
- No obscure abbreviation: `ctx`, `cfg`, `tmp`, `res2`, `x`.
- A file carries the name of its responsibility, in kebab-case: `situation.ts`, `backend-request.ts`. Never `utils`, `helpers`, `misc`, `common`.

## 2. One module, one responsibility

When a file grows, we move a **named** responsibility out of it. We do not raise a ceiling, and we do not split "at random" into `part1`, `part2`.

```ts
// ✗ situation.ts that also computes the AI usage of the ticket
// ✓ situation.ts (phase, progress) and usage.ts (tokens, cost)
```

## 3. Short functions, early returns

We handle the exceptional cases first, then the normal case, without nesting.

```ts
// ✗
function closeTicket(situation, actor, at) {
  if (actor.kind === 'developer') {
    if (situation.phase === 'qaValidation') { /* … */ }
  }
}

// ✓
function closeTicket(situation: Situation, actor: Actor, at: Instant): Result<Situation, ClosingError> {
  if (actor.kind !== 'developer') return fail('onlyDeveloperCloses');
  if (situation.closedAt !== undefined) return fail('ticketClosed');
  if (situation.phase !== 'qaValidation' || situation.progress.state !== 'done') return fail('notValidated');
  return ok({ ...situation, closedAt: at });
}
```

## 4. Types that make errors impossible

- A **discriminated union** rather than booleans or optional fields that combine badly.
- `interface` for the shape of an object, `type` for a union.
- Parameters that are not modified are `readonly`.

```ts
// ✗ { started: boolean; done: boolean; note?: string }   // started=false, done=true : what does this case mean?
// ✓
type Progress =
  | { state: 'notStarted' }
  | { state: 'inProgress'; note: string }
  | { state: 'done' };
```

- No `as` to silence the compiler. Data that comes from outside (HTTP, a file, the output of an agent) is **validated by Zod at the boundary**. After that, we trust the type.

## 5. Errors: one path for each kind

- **A refused business rule** is an expected result. We return a `Result` with a named error code, and the caller handles it.
- **A bug or a failure** (unreadable database, broken invariant) throws an exception, which goes up to the boundary (HTTP route, command) where it is logged once.
- We never swallow an error.

```ts
// ✗ try { save(ticket); } catch (error) { console.log(error); }
// ✓ const closed = closeTicket(situation, actor, at);
//   if (!closed.ok) return reply.refused(closed.error);
```

- **The absence of a value.** We write `null` for "computed, and there is nothing" (`computeWait` → `null`) and an optional field for "not provided" (`closedAt?`). We do not mix the two for the same concept.

## 6. No "in the meantime" code

No adapter for a case that does not exist, no branch "if the function exists, otherwise…", no commented-out code, no `TODO` without an entry in the plan.

```ts
// ✗ if (store.saveWait) store.saveWait(wait); else legacySave(wait);
// ✓ store.saveWait(wait);   // add the method to the store if it is missing
```

## 7. Comments: the why, in one sentence

The code says **what**. A comment only explains what is not obvious: a reason, a product rule, a trap. Never a ticket identifier, a date or history: that is the role of git and the ADRs.

```ts
// ✗ // Loop over the questions (added on 19/10 for batch 3)
// ✓ /** A wait on the developer comes first, because it is what they must see. */
```

An exported function whose name is not enough has a one-line `/** … */` comment.

## 8. Imports

- Inside a package: relative paths. Between packages: the package name (`@project-tracker/contract`), never `../../autre-paquet`.
- Types are imported with `import type`.
- The boundaries between packages and between the folders of `core` are those of [ADR 0014](adr/0014-decoupage-en-paquets.md).

## 9. Tests

- A test carries the name of the **rule** it establishes, not the name of the function.
- One behavior per test. The sample data is generic, without any client name.
- Never compare large contents with `toEqual`: a failure would show a huge diff. We compare a fingerprint, or the few useful fields.

```ts
// ✗ it('computeWait works', …)
// ✓ it('puts the developer first, since what needs them must be seen', …)
```

## Checked by ESLint (`eslint.config.js`)

| Rule | Threshold |
|---|---|
| Strict typed rules of typescript-eslint (`any`, non-null `!`, unawaited promises…) | — |
| No default export (named exports only) | — |
| Explicit return type on what a module exports | — |
| Exhaustive `switch` on a union | — |
| No nested ternary, `===` required, braces required, `const` when possible | — |
| No `console` in `core` | — |
| Function complexity | 10 |
| Nesting depth | 3 |
| Function parameters | 4 (beyond that, an object) |
| Lines in a function (excluding tests) | 60 |
| Lines in a file, without blank lines or comments (excluding tests) | 400, without exception |
| Boundaries of ADR 0014; domain without I/O, clock or randomness | — |
