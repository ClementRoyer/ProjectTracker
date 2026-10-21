# Glossary

- Status: **validated by the user (2026-10-18)**
- Date: 2026-10-18
- Sources: [needs.md](needs.md), [features.md](features.md), ambiguities noted in the [product audit](../analysis/2026-10-16-audit-v1/product.md) §3

## Rules

- **One word per notion, one notion per word.** The documents, the interface, the agents' messages and the code use these terms and no others.
- **"Code" column**: the name used in the code, in English ([ADR 0006](../adr/0006-langues.md)).
- **"Replaces (V1)" column**: the V1 words that must no longer be used for this notion.

## People and assignees

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Developer** | `developer` | The person who uses the tool. They handle tickets, report what they learn, answer questions, deliver and validate in QA. They are the only one who can declare a ticket closed. | `"l'utilisateur"`, `"page"` as author |
| **Agent** | `agent` | An AI assignee, identified by a stable name. It can handle several tickets and belong to any tool (Claude Code or another). | owner, label, `--agent` |
| **Conversation** | `session` | One concrete run of an agent. It can stop, and a new conversation can resume a ticket. | session (in the sense of identity) |
| **Assignee** | `assignee` | The one who handles a ticket: the developer or an agent. A ticket has at most **one assignee per role** at a time ([ADR 0010](../adr/0010-back-end-intervenant-du-ticket.md)). | owner, détenteur, celui qui a "réservé" |
| **Role** | `role` | The part of a ticket's work held by an assignee: `front` (the project's repository) or `back-end` (the mirror on the back-end server). | — |
| **Partner** | `partner` | An outside actor we exchange with about a ticket. The back-end is no longer one: it is an assignee with role `back-end`. | partenaire (no longer means the back-end) |
| **End user** | `endUser` | A person who uses the product being developed: they test in QA and give feedback. Do not confuse with the developer. | `"user"`, `"utilisateur"` without qualification |

## The ticket

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Project** | `project` | A set of tickets, attached to a code repository. The normal case is a single project. | — |
| **Ticket** | `ticket` | The unit of work tracked. Everything is attached to a ticket. | item, carte, card, tâche (`kind: task`) |
| **Origin** | `origin` | Where the ticket comes from: `jira` (imported from Jira) or `local` (created in the tool, and it stays so). | — |
| **Key** | `key` | The readable identifier of a ticket: the Jira key (`ABC-123`) or a local key. | id, ticket id |
| **Initial request** | `initialRequest` | What was asked at the start: the Jira description, or the sentence that created the local ticket. | description, contexte |
| **Jira status** | `jiraStatus` | The status of the ticket in Jira, shown as it is. Distinct from the phase. | issueStatus |

## A ticket's situation

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Situation** | `situation` | Where a ticket stands, in four elements: **phase**, **progress**, **wait** and **assignee**. | stage, column, standing, status, activity (five words for one notion) |
| **Phase** | `phase` | The lifecycle step, in this order: **To do** (`todo`, ticket not started yet) → **Analysis** (`analysis`) → **Development** (`development`) → **Test** (`test`) → **QA delivery** (`qaDelivery`) → **QA validation** (`qaValidation`). | stage, colonne |
| **Progress** | `progress` | Where things stand within the phase: **not started** (`notStarted`), **in progress** (`inProgress`, with a sentence saying where), **done** (`done`). | activity, standing |
| **Wait** | `wait` | What the ticket waits for in order to move on, and since when: the developer, another assignee (the back-end), a partner, an end user, a resource, a held file. No wait = the ticket can move on. | blockedBy, blocking, waiting |
| **Closed** | `closed` | The final state, declared by the developer alone, after QA validation. | done (colonne) |
| **Stale** | `stale` | An ongoing ticket where nothing has moved for a configurable delay. | noNews, standing `noNewsAt` |

## The ticket's record

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Journal** | `journal` | The dated follow-up of everything that happened on a ticket, in full text. Each item is an **entry**. | history, events, messages, exchanges, notes (huit flux) |
| **Entry** | `entry` | An item of the journal, with an author, a date and a **type** (below). An entry is never modified: it is corrected by a more recent entry. | event, message, note, memory |
| **Entry type** | `entryType` | `progress` (progress update: done, in progress, remaining, pitfalls), `decision` (a decision and its reason), `exchange` (an exchange between assignees or with a partner, word for word), `feedback` (feedback from an end user), `question`, `answer`, `request`, `situationChange` (change of situation), `testRun` (a test run), `jiraImport` (what a Jira import brought). | — |
| **Sheet** | `sheet` | The reading of the ticket in three parts: the initial request, the history up to the takeover, the situation today. It is built from the journal and serves both the developer and an agent who picks up the ticket. | brief, brief.md, fiche |

## Talking with the developer

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Question** | `question` | A request from an assignee **to the developer**, with context, options and a recommendation. While it is open, the ticket waits for the developer. | question (unchanged) |
| **Answer** | `answer` | The developer's answer to a question. It is routed to the assignee, who acknowledges it. | answer |
| **Request** | `request` | An action asked **by the developer** of an assignee: `"Où en est-on ?"`, rerun the tests… | request stored as an answer, action, statusRequest, rerun |
| **Acknowledgement** | `acknowledgement` | The confirmation that the assignee received an answer or a request. | accusé, claim d'une réponse |
| **Inbox** | `inbox` | Everything that waits for the developer: open questions, validations, action requests, from the oldest to the newest. | `"ce qui m'attend"`, view `"Tout"` |
| **Updates** | `updates` | What has changed since the developer's **last visit** (`lastVisit`): new tickets, Jira updates, the agents' work. | notifications, `"Nouveau"` |

## Jira

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Jira import** | `jiraImport` | Reading of the Jira tickets assigned to the developer on the project, started by them. It brings the initial request, the status and the comments. It never writes to Jira. | issue tracker sync, refresh |
| **Jira gap** | `jiraDrift` | A difference between the Jira status and the local phase, simply shown. | gap, mismatch |

## Working in parallel

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Assignment** | `assignment` | Becoming the assignee of a ticket. It stays valid as long as the assignee gives signs of life. | claim, lease, réservation |
| **Held file** | `fileHold` | A file declared by a ticket's assignee before changing it. Another ticket cannot change it in the meantime. | hold, files |
| **Priority** | `priority` | The order of importance of a ticket, set by the developer: urgent (`urgent`), high (`high`), normal (`normal`, default), low (`low`) (ADR 0032). When several requests wait for the same held file, the one of the most important ticket goes first (ADR 0021). | — |
| **Shared resource** | `resource` | An asset used by one ticket at a time, for example the e2e test environment. | — |
| **Lock** | `lock` | Exclusive use of a shared resource during an operation. The word is reserved for this use. | lock (also used for data files) |
| **Working folder** | `worktree` | The git folder of its own for a ticket, with its branch, where its assignee works without disturbing the other tickets ([ADR 0008](../adr/0008-eviter-les-conflits-entre-tickets.md)). Optional: a ticket can also be handled in the main folder. | — |
| **Overlap** | `overlap` | A detected risk of conflict: two tickets changed the same file. It is a signal, not a block. | overlap (same word, meaning specified) |
| **Back-end request** | `backendRequest` | A request addressed to the `back-end` role of a ticket, by the front agent or by the developer. The ticket then waits for the back-end. | message au partenaire back-end |
| **Launcher** | `launcher` | The small program of the tool installed on the back-end server. It picks up back-end requests and starts a new agent for each one, with the configured command. It manages the held files of the mirror through local `.lock` files. | — |
| **Execution** | `execution` | The run of an agent started by the launcher for a back-end request, from start to end. The files it holds are released at the end of the execution. | — |
| **Conflict** | `conflict` | Two tickets that want the same file or the same resource at the same time. | overlap |
| **Guard** | `guard` | The check that refuses a forbidden action before it happens: writing a file held by another ticket, using a resource without its lock. | guard (unchanged) |

## Finishing and delivering

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **Test run** | `testRun` | One test run for a ticket, with its result (passed, failed) and its date. | run, campaign |
| **Manual test** | `manualTest` | A test done by hand: **visual** (by the developer) or **user** (by an end user), with its feedback. | — |
| **Delivery** | `delivery` | A set of tickets delivered together in QA, then validated. | lot (au sens de livraison), delivery |
| **Changelog** | `changelog` | The text describing a delivery, produced as an option. | — |
| **Template** | `template` | A template file of the project, used to generate an export. | — |
| **Export** | `export` | A file generated for a ticket from a template. | — |

## Around the project

| Term | Code | Definition | Replaces (V1) |
|---|---|---|---|
| **AI usage** | `usage` | The estimated AI consumption, per ticket and per period (day, week, month). | coût, costs |
| **Attachment** | `attachment` | A file attached to a ticket: a screenshot or another file. | capture d'écran, screenshot |
| **Repository** | `repository` | A code repository of the project. | repo |
| **Group** | `group` | A free grouping of tickets, for example by theme. | lot (au sens de regroupement) |
| **Document** | `document` | A reference document of the project, readable from the tool. | doc |

## Words no longer to use

| V1 word | Problem | Instead |
|---|---|---|
| item, carte | Two names for the ticket | **Ticket** |
| tâche (`kind: task`) | The V1 `"tâches du développeur"` match no need | Removed (user's decision, 2026-10-18) |
| stage, column, standing, status, activity | Five words for "where is it?" | **Situation** (phase, progress, wait, assignee) |
| blockedBy | Mixed up with the status | **Wait** |
| claim, lease, hold, reservation | Overlaps | **Assignment**, **held file**, **lock** |
| listener, dispatcher, aiguilleur | The mechanism of a single agent tool | A technical notion, outside the domain vocabulary |
| capture | Raw output of a hook | A technical notion; the result is an **entry** `exchange` |
| memory, brief | Duplicates of the journal and the sheet | **Entry** and **sheet** |
| lot | Meant three things | **Delivery**, **group**, and "plan step" for the development of the tool |

## User decisions (2026-10-18)

| Question | Answer | Effect |
|---|---|---|
| Code in English, interface and documents in French? | "Yes." | [ADR 0006](../adr/0006-langues.md) |
| "Fiche" for the three-part reading? | "OK for fiche." | Term kept |
| Remove the V1 "tâches"? | "Yes, remove it." | The notion disappears |
| One phase before analysis? | "Yes, something like that." | Phase **To do** (`todo`) added at the head of the cycle |
