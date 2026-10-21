# Guide de style du code

- Statut : Accepté ([ADR 0019](adr/0019-regles-de-code.md))
- Sources : le [guide TypeScript de Google](https://google.github.io/styleguide/tsguide.html), le guide de style de la V1 (`legacy/references/code-style.md`) et les leçons de son [audit](analysis/2026-10-16-audit-v1/README.md).

Ce guide ne contient que ce qu'un outil ne vérifie pas. Les règles vérifiées par ESLint sont listées à la fin : on ne les répète pas dans le code par des commentaires, on les respecte.

## 1. Nommer avec le glossaire

Les notions du domaine portent le nom de la colonne `Code` du [glossaire](product/glossary.md). Jamais de synonyme.

```ts
// ✗ item, card, owner, blockedBy
// ✓ ticket, assignee, wait
interface ActiveAssignment { ticketId: string; role: Role; assignee: Assignee }
```

- Une fonction commence par un verbe : `computeWait`, `closeTicket`, `findOverlaps`.
- Un booléen se lit comme une question : `isStale`, `hasOpenQuestion`, `canClose`.
- Pas d'abréviation obscure : `ctx`, `cfg`, `tmp`, `res2`, `x`.
- Un fichier porte le nom de sa responsabilité, en kebab-case : `situation.ts`, `backend-request.ts`. Jamais `utils`, `helpers`, `misc`, `common`.

## 2. Un module, une responsabilité

Quand un fichier grossit, on en sort une responsabilité **nommée**. On ne relève pas un plafond, et on ne découpe pas « au hasard » en `part1`, `part2`.

```ts
// ✗ situation.ts qui calcule aussi l'usage du ticket
// ✓ situation.ts (phase, avancement) et usage.ts (jetons, coût)
```

## 3. Fonctions courtes, retours anticipés

On traite d'abord les cas qui sortent, puis le cas normal, sans imbrication.

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

## 4. Des types qui rendent les erreurs impossibles

- Une **union discriminée** plutôt que des booléens ou des champs optionnels qui se combinent mal.
- `interface` pour la forme d'un objet, `type` pour une union.
- Les paramètres qu'on ne modifie pas sont `readonly`.

```ts
// ✗ { started: boolean; done: boolean; note?: string }   // started=false, done=true : que veut dire ce cas ?
// ✓
type Progress =
  | { state: 'notStarted' }
  | { state: 'inProgress'; note: string }
  | { state: 'done' };
```

- Pas de `as` pour faire taire le compilateur. Une donnée venue de l'extérieur (HTTP, fichier, sortie d'un agent) est **validée par Zod à la frontière**. Ensuite, on fait confiance au type.

## 5. Erreurs : un chemin pour chaque sorte

- **Une règle métier refusée** est un résultat attendu. On renvoie un `Result` avec un code d'erreur nommé, et l'appelant le traite.
- **Un bug ou une panne** (base illisible, invariant cassé) lève une exception, qui remonte jusqu'à la frontière (route HTTP, commande) où elle est journalisée une seule fois.
- On n'avale jamais une erreur.

```ts
// ✗ try { save(ticket); } catch (error) { console.log(error); }
// ✓ const closed = closeTicket(situation, actor, at);
//   if (!closed.ok) return reply.refused(closed.error);
```

- **L'absence de valeur.** On écrit `null` pour « calculé, et il n'y a rien » (`computeWait` → `null`) et un champ optionnel pour « non renseigné » (`closedAt?`). On ne mélange pas les deux pour une même notion.

## 6. Pas de code « en attendant »

Pas d'adaptateur pour un cas qui n'existe pas, pas de branche « si la fonction existe, sinon… », pas de code commenté, pas de `TODO` sans entrée dans le plan.

```ts
// ✗ if (store.saveWait) store.saveWait(wait); else legacySave(wait);
// ✓ store.saveWait(wait);   // on ajoute la méthode au store si elle manque
```

## 7. Commentaires : le pourquoi, en une phrase

Le code dit **quoi**. Un commentaire n'explique que ce qui n'est pas évident : une raison, une règle du produit, un piège. Jamais d'identifiant de ticket, de date ou d'historique : c'est le rôle de git et des ADR.

```ts
// ✗ // Boucle sur les questions (ajouté le 19/10 pour le lot 3)
// ✓ /** A wait on the developer comes first, because it is what they must see. */
```

Une fonction exportée dont le nom ne suffit pas a un commentaire `/** … */` d'une ligne.

## 8. Imports

- Dans un paquet : des chemins relatifs. D'un paquet à l'autre : le nom du paquet (`@project-tracker/contract`), jamais `../../autre-paquet`.
- Les types s'importent avec `import type`.
- Les frontières entre paquets et entre dossiers de `core` sont celles de l'[ADR 0014](adr/0014-decoupage-en-paquets.md).

## 9. Tests

- Un test porte le nom de la **règle** qu'il établit, pas celui de la fonction.
- Un comportement par test. Les données d'exemple sont génériques, sans nom de client.
- Ne jamais comparer de gros contenus avec `toEqual` : un échec afficherait un diff énorme. On compare une empreinte, ou les quelques champs utiles.

```ts
// ✗ it('computeWait works', …)
// ✓ it('puts the developer first, since what needs them must be seen', …)
```

## Vérifié par ESLint (`eslint.config.js`)

| Règle | Seuil |
|---|---|
| Règles typées strictes de typescript-eslint (`any`, `!` non nul, promesses non attendues…) | — |
| Pas d'export par défaut (exports nommés seulement) | — |
| Type de retour explicite sur ce qu'un module exporte | — |
| `switch` exhaustif sur une union | — |
| Pas de ternaire imbriqué, `===` obligatoire, accolades obligatoires, `const` si possible | — |
| Pas de `console` dans `core` | — |
| Complexité d'une fonction | 10 |
| Profondeur d'imbrication | 3 |
| Paramètres d'une fonction | 4 (au-delà, un objet) |
| Lignes d'une fonction (hors tests) | 60 |
| Lignes d'un fichier, sans blancs ni commentaires (hors tests) | 400, sans exception |
| Frontières de l'ADR 0014 ; domaine sans I/O, sans horloge, sans aléatoire | — |
