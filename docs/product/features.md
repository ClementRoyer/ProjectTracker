# Features

- Status: **validated by the user (2026-10-18)**
- Date: 2026-10-18
- Source: [needs.md](needs.md), validated on 2026-10-18

## Rules of this document

- **Each feature cites the needs it serves.** A feature with no need has no place here.
- **The priority is inherited from the needs**: primary (P) if it serves at least one primary need, secondary (S) otherwise.
- We describe **what** the tool does, not **how** it is built. Technical choices belong to the architecture and the ADRs.

## The ticket and its record

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F1 | **Ticket**: identity, title, origin (Jira or local), link to Jira, initial request | B2.2, B2.4, B6.2 | P |
| F2 | **Jira import on request**: I start it; it fetches the tickets assigned to me on the project (title, description, status, comments), and flags the new ones and those that changed. The address and the token come from a configuration file. Nothing is ever written to Jira. | B1.1, B1.2, B2.3, B2.4, B6.3, C1, C2 | P |
| F3 | **Quick creation of a local ticket**, in one sentence, without leaving what I am doing. It stays local. | B2.1, B2.2 | P |
| F4 | **Ticket situation**: the phase (to do → analysis → development → test → QA delivery → QA validation), its progress (not started, in progress with where it stands, done), the possible wait (who, since when) and the assignee (me or a given agent, an agent being able to carry several) | B1.3, B6.4, B7.1, B3.1, B3.3 | P |
| F5 | **Ticket sheet**, readable in three parts: the initial request, the history up to my taking over, the situation today. It also contains the decisions and their reasons, and the latest tests. | B6.1, B6.2, B6.3, B6.4, B5.5, B8.1 | P |
| F6 | **Ticket journal**: everything that happened, dated, with its author (me, an agent, Jira, the back-end), in full text and never summarized. The exchanges with the back-end appear there. | B1.2, B1.4, B6.3, B6.6, B7.2, B7.3 | P |

## Feeding the tracking

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F7 | **The agents keep the ticket up to date**: progress, decisions, exchanges, tests, questions. This holds for every kind of agent ([ADR 0002](../adr/0002-perimetre-multi-agents-ouvert.md)), and the information and analysis produced by the start-up skill also enter here. | B1.4, B3.2, B7.3 | P |
| F8 | **I report by telling an agent**: feedback received by email or in person, a history I know, an action I took (delivered to QA, validated). The agent records it in the ticket. | B1.7, B7.4, B6.3 | P |

## Seeing

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F9 | **What has changed since my last visit**: new tickets, updates from Jira, work done or finished by the agents | B1.1, B1.2, B1.4 | P |
| F10 | **Overview of the tickets** and their situation, consulted when I decide, without interruption | B1.3, B4.1 | P |
| F11 | **Ticket with no news**: a ticket that no longer moves is flagged | B4.2 | P |
| F12 | **What is waiting for me**: in one place, everything that waits for an answer or an action from me, from the oldest to the newest | B1.6, B5.1 | P |

## Deciding

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F13 | **Complete question**: each request addressed to me carries the useful history, the last step, the context, the options and a recommendation | B5.2 | P |
| F14 | **My answer reaches the one waiting**, without me going through their conversation; I see that it was taken into account, then the rest of the ticket | B5.3, B5.4 | P |

## Working in parallel

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F15 | **Resuming without loss**: any new conversation resumes a ticket from its record (F5 and F6) | B4.3 | P |
| F16 | **No conflict between tickets**: two tickets handled at the same time do not change the same code and do not use the same shared environment at the same moment; the conflict is avoided or flagged before it happens | B4.4 | P |

## Finishing and delivering

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F17 | **Test results** of the ticket: last run, passed or not, date | B8.1 | P |
| F18 | **Only I declare a ticket finished**; no agent can do it | B8.4 | P |
| F19 | **QA delivery batch**: I group the tickets that go together, I note the delivery then the validation, and each ticket moves on accordingly | B9.1, B9.2 | P |

## AI usage

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F20 | **AI usage**, approximate, per ticket, and overall per day, per week and per month | B10.2, B10.3 | P |

## Secondary

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F21 | **Proposal of what comes next**: quick win, nearly done, close deadline | B1.5 | S |
| F22 | **Delivery changelog**, enabled by an option | B9.3 | S |
| F23 | **Code changes** of the ticket | B6.7 | S |
| F24 | **Manual tests**: visual test done, user test done or not, with its feedback | B8.2, B8.3 | S |
| F25 | **Several projects** | B0.1 | S |

## Takeovers from V1 (user's request, 2026-10-18)

The AI had proposed not to take over these features, for lack of an expressed need. The user answered: "Add these points you found in V1, I want them." They are **secondary by default**.

| ID | Feature | Needs | Prio |
|---|---|---|---|
| F26 | **Notifications**: bell for updates, counter in the tab title, browser notifications | B11.1 | S |
| F27 | **Themes** (system, light, dark, high contrast) and interface **language** (French, English) | B11.2 | S |
| F28 | **Template exports**: generate a tracking file of a ticket from a project template | B11.3 | S |
| F29 | **Gaps with Jira**: flag when the Jira status does not match the local situation (display only, nothing written to Jira) | B11.4 | S |
| F30 | **Screenshots and attachments** on a ticket | B11.5 | S |
| F31 | **Repositories, batches and project documents**: files changed per repository, groupings of tickets, reference documents | B11.6 | S |
| F32 | **"Où en est-on ?"**: ask the ticket's assignee for a status update, who answers in the journal | B11.7 | S |
| F33 | **Messaging between a ticket's assignees** (front and back-end): each exchange is a journal entry, kept word for word and routed according to ADR 0007; the back-end is launched by the launcher ([ADR 0010](../adr/0010-back-end-intervenant-du-ticket.md)). Replaces the capture of back-end exchanges from V1 | B11.8 | S |
| F34 | **Explicit coordination**: a ticket claimed by an assignee, declared held files, lock of a shared resource (e2e tests), guard against forbidden writes. These are the visible means of F16. | B11.9 | S |

The V1 technical mechanisms that carry them (hooks, capture format, regex-based guard…) will be re-evaluated at the architecture step: we keep the feature, not necessarily its V1 implementation.
