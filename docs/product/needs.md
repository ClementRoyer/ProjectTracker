# Developer needs

- Status: **validated by the user (2026-10-18)**, needs and priorities
- Date: 2026-10-18
- Method: we start from the developer's day, not from the existing tool. No solution words here (no table, command, hook…). The features are derived from them afterwards.

Each need is written in the first person, from the developer's point of view: "I need… to…". Needs marked **(H)** are the AI's assumptions, to be confirmed, corrected or struck out. Confirmed needs lose their **(H)**.

## Summary of needs

Validated by the user on 2026-10-18. The details and their words are in sections M1 to M10 below.

Priority: **P** = primary, mandatory, it is the basic need; **S** = secondary, a helper. The AI proposed these priorities, then the user settled the uncertain lines on 2026-10-18: B5.4 P, B6.7 S, B8.2 S, B8.3 S, B10.2 and B10.3 P. They did not dispute the other lines. They also confirmed that no moment of their day is missing. The B11 needs take up features from V1 that the user wants to keep ("Add these points you found in V1, I want them", 2026-10-18). They are classed as secondary by default.

| ID | I need to… | Priority |
|---|---|---|
| **Knowing what has changed** | | |
| B1.1 | see the new tickets assigned to me, revealed by the Jira import I run | P |
| B1.2 | see the tickets updated since my last visit (status, user feedback…) | P |
| B1.4 | know what the agents did and finished since my last visit | P |
| **Knowing where each ticket stands** | | |
| B1.3 / B6.4 | see the situation of each ticket: phase, progress, any wait | P |
| B3.1 | know who handles each ticket (me or a given agent) | P |
| B7.1 | know that a ticket waits for someone outside, who, and since when | P |
| B4.2 | spot a ticket that no longer moves | P |
| B4.1 | see all this when I come to look, without being interrupted | P (principle) |
| **What is waiting for me** | | |
| B1.6 / B5.1 | see in one place what waits for an answer from me, and since when | P |
| B5.2 | receive each request with its history, last step, context, options and a recommendation | P |
| B5.3 | follow what happens after my answer: whether it was taken into account, and where the ticket stands | P |
| B5.4 | have my answer go back to whoever is waiting, without me acting as the courier | P |
| **Reviewing a ticket** | | |
| B6.1 | find all the ticket's information in one place | P |
| B6.2 | find the initial request | P |
| B6.3 | know the ticket's history before me (Jira comments, or what I provide) | P |
| B5.5 | find what was decided and why | P |
| B6.6 / B7.2 | find what was said exactly (exchanges, decisions), never a summary | P |
| B7.3 | have the exchanges with the back-end (AI agent) attached to the ticket | P |
| **Feeding the tracking** | | |
| B2.1 | note a new subject very fast, without losing my focus | P |
| B2.2 | a subject found locally stays local | P (constraint) |
| B2.3 | start the Jira import myself | P |
| B2.4 | copy nothing from a Jira ticket, and keep the link | P |
| B1.7 / B7.4 | quickly report feedback received by email or in person, by telling an agent | P |
| B3.2 | have what my start-up skill produces (Jira info, analysis) join the ticket | P |
| B3.3 | entrust one or several tickets to an assignee, with no fixed rule | P |
| **Working in parallel** | | |
| B4.3 | resume a stopped ticket in a new conversation, without loss | P |
| B4.4 | have two tickets handled at the same time not get in each other's way (code, environment) | P |
| **Finishing and delivering** | | |
| B8.1 | see the test results of the ticket | P |
| B8.4 | be the only one to declare a ticket closed | P |
| B9.1 | know which tickets go together to QA | P |
| B9.2 | note that a batch was delivered to QA | P |
| **AI usage** | | |
| B10.2 | know the AI usage per ticket, roughly | P |
| B10.3 | know the overall usage per day, week and month | P |
| **Helpers** | | |
| B1.5 | be offered what comes next (quick win, nearly done, deadline) | S ("bonus") |
| B9.3 | produce a delivery changelog, as an option | S ("bonus, not primary") |
| B6.7 | see what changed in the code for this ticket | S |
| B8.2 | note that a manual visual test was done | S |
| B8.3 | follow the user test (done or not, feedback) | S |
| B0.1 | follow several projects (rare case, about 5%) | S ("bonus", see [understanding.md](understanding.md) §5) |
| **Taken from V1, at the user's request** | | |
| B11.1 | be notified (bell, tab title, browser) | S |
| B11.2 | choose the interface's colour theme and language | S |
| B11.3 | generate files from templates (exports) | S |
| B11.4 | see the gaps between the Jira status and the local situation | S |
| B11.5 | attach screenshots and attachments to a ticket | S |
| B11.6 | see the repositories, batches and documents of the project | S |
| B11.7 | ask "Où en est-on ?" of a ticket's assignee | S |
| B11.8 | have the back-end's messages captured automatically, and have it receive the exchange rules | S |
| B11.9 | explicitly coordinate the assignees: claiming a ticket, held files, lock of a shared resource, guard against forbidden writes | S |

## Who I am

I am a developer on a project, rarely more than one. I have several tickets open at the same time. Some I handle myself; others are entrusted to AI agents, an agent possibly carrying one or several. Tickets come from Jira (a bug in QA or in production, a feature request) or from me (a bug found while testing, an idea, an invisible improvement).

---

## M1. I start my day, or I come back after a break

**Situation**: I have several tickets in progress. I no longer remember exactly where each one stands.

**The user's words (2026-10-18)**:
> "I want to know whether new tickets have appeared, whether some tickets have had updates (status, user feedback, etc.), then where the tickets in progress stand, whether agents have worked and finished tasks, whether everything is fine, what there is to do next."

In the order I look for them:
- B1.1 I need to know **which new tickets have appeared**.
- B1.2 I need to know **which tickets have been updated since my last visit**: status change, user feedback, etc.
- B1.3 I need to see **where the tickets in progress stand**.
- B1.4 I need to know **what the agents did and finished** since my last visit.
- B1.5 I need to know **what there is to do next**.
- B1.6 I need to know **which ones are waiting for me**, and since when.

**What this teaches us**: the changes that matter do not only come from the agents. They also come from **outside**: a new ticket, a changed status, user feedback. The starting point of the day is **"what has changed?"**, then only **"where do we stand?"**, and finally **"what do we do?"**.

**The user's clarifications (2026-10-18)**:

| Question | Answer | Need that follows |
|---|---|---|
| Which new tickets concern you? | "A ticket assigned to me, on the project in question." | B1.1 specified: the new tickets **assigned to me** on the project. |
| Where do user feedbacks arrive? | "On Jira (can be fetched automatically), by email or in person, and then it's up to me to note it." | B1.7 I need to **add myself, quickly, a feedback received by email or in person** on a ticket. |
| "What to do next": decided or proposed? | "It could be proposed (quick win, nearly done, deadline, etc.) (bonus?)" | B1.5 specified: a **proposal** of what comes next, by criteria such as quick win, nearly done or deadline. **Secondary candidate.** |

## M2. A new subject arrives

**Situation**: a bug comes up from QA, a request arrives in Jira, or I find a problem myself while testing something else.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| A subject you find yourself: does it go to Jira afterwards, or does it stay local? | "It must stay local." |
| Jira tickets: do they appear on their own, or do you add them yourself? | "I prefer to start the Jira imports myself." |

- B2.1 I need to **note the subject very fast**, without losing my focus on what I am doing.
- B2.2 A subject I find myself **stays local**: it is never sent to Jira.
- B2.3 **I start the Jira import myself**, when I decide. Nothing arrives on its own.
- B2.4 For a ticket imported from Jira, I need to **not copy** what is already there (title, description, comments) and to keep the link to Jira.
- ~~B2.5 Decide later when and by whom a new subject will be handled~~: **struck out** by the user (2026-10-18).

**What this teaches us**: the relationship with Jira is **read-only, and on my request**. The "new tickets" and "updates" of the morning (B1.1, B1.2) are those revealed by **the import I run**.

## M3. I launch the work on a ticket

**Situation**: I decide to handle a ticket, myself or by entrusting it to an agent.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| How do you entrust a ticket to an agent today? | "I use a skill to fetch the Jira info, scan the codebase and start the analysis." |
| What is painful or repetitive? | "NA" (nothing in particular) |
| How do you decide who does what, and the groupings? | "There is no rule." |

- B3.1 I need to **know who handles each ticket** (me or a given agent).
- B3.2 Starting a ticket is **already tooled**: a skill fetches the Jira info, goes through the code and starts the analysis. I need **what it produces (ticket info, analysis) to join the ticket's tracking**, without redoing it.
- B3.3 I entrust one or several tickets to an assignee **with no fixed rule**: the tracking must accept this, without imposing anything.

**What this teaches us**: starting is not a pain point. The tracking must **not replace** this start-up tool, but **pick up what it produces**. Assignment choices stay free.

## M4. Several tickets move forward at the same time

**Situation**: agents work on several tickets while I do something else, sometimes my own ticket.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| When do you want to know what is happening? | "When I come to look." |
| A ticket that no longer moves: does it happen, and how do you see it? | "Yes, I look for the conversation, or I create a new one." |
| Two tickets getting in each other's way: has it already happened? | "Yes, very very often. For now, I don't do many tickets at the same time (same moment as the code change), so I don't have the problem, but we'll have it with the new tool." |

- B4.1 I need to know **what is happening on each ticket when I come to look**. I don't need to be interrupted.
- B4.2 I need to **spot a ticket that no longer moves**.
- B4.3 I need to **resume a stopped ticket in a new conversation, without loss**: the new assignee must start from everything that was done and said.
- B4.4 I need **two tickets handled at the same time not to get in each other's way**, on the same code or on a shared environment.

**What this teaches us**:
- The information is **consulted, not pushed**: the developer comes to look when they decide.
- When a ticket stops, resuming it today goes through **searching for the old conversation, or through a new conversation**. The ticket must therefore carry enough information to be resumed by anyone, at any moment.
- **Conflicts are frequent** as soon as code is changed in parallel. Today the developer avoids them by **not parallelizing** the changes. Yet handling several tickets at once is exactly the promise of the new tool: without an answer to conflicts, this promise does not hold.

## M5. Someone needs me

**Situation**: the one handling a ticket needs a decision or information from me.

**What the user does today (2026-10-18)**:

| Question | Answer |
|---|---|
| Where do these requests arrive, and how do you notice them? | "I just check the latest conversations I have, and it's mostly in my memory." |
| What do you need to decide quickly? | "The history, the last step used, and the context, the options + recommendations." |
| What is painful after answering? | "The follow-up, knowing where it stands." |

- B5.1 I need **to see in one place everything that waits for an answer from me**, without relying on my memory or reopening each conversation.
- B5.2 To decide quickly, I need the request to come with **the ticket's history, the last step, the context, the options and a recommendation**.
- B5.3 After answering, I need to **follow what happens next**: that my answer was taken into account, and where the ticket stands since then.
- B5.4 I need **my answer to go back to whoever is waiting**, without me acting as the courier.
- B5.5 I need to **find later what I decided** and why.

**What this teaches us**: today, **nothing guarantees that a pending request is not forgotten**. Everything relies on the developer's memory. And answering closes nothing: the real issue is **the follow-up after the answer**.

## M6. I come back to a ticket

**Situation**: I pick up a ticket after several days, or after working on others. This is the heart of the difficulty expressed by the user.

**The user's words (2026-10-18)**:
> "Mainly the context. What is the initial request, then what was the situation when I took the ticket over (e.g. a dev request was taken on by another dev, it stayed in test for a while, then finally fixes are needed), and what is the situation today."

- B6.1 I need to **review all the ticket's information** in one place.
- B6.2 I need to find **the initial request**.
- B6.3 I need to know **the situation when I took the ticket over**: its history before me (who had it, where it went, why it came back).
- B6.4 I need to know **the situation today**.
- B6.5 *Merged with B5.5* (same need: find what was decided and why, without rereading the conversations).
- B6.6 I need to find **what was said exactly**, with a partner as well as for a decision, and not a summary.
- B6.7 I need to see **what changed in the code** for this ticket.

**What this teaches us**: the context is read in **three steps**: the request, the history up to my taking over, the current situation. **A ticket has a life before me**: another developer, a move to test, a return for fixes. Tracking cannot start at the moment I take the ticket.

**The user's clarifications (2026-10-18)**:

| Question | Answer | Need that follows |
|---|---|---|
| Where is the history before you? | "Jira comments, or else it's up to me to provide it." | B6.3 specified: the history comes from **the Jira comments**, or **I provide it**. |
| What is "the situation today"? | "It's saying whether development has started, if so where it is, whether the analysis is done or in progress, whether it's waiting for a user or back-end answer, for example." | B6.4 specified, see below. |

**The situation of a ticket**, according to the user, is stated in three points:
1. **The phase**: analysis, development, test, QA delivery, QA validation (full cycle given in M8).
2. **The progress within this phase**: not started, in progress (where it stands), done.
3. **The possible wait**: an answer from a user, from the back-end, etc.

## M7. I am waiting for someone else

**Situation**: the ticket depends on another team, a partner (for example the back-end) or an environment.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| Who are the partners? | "The back-end is an AI agent reachable through an exposed channel (the solution can change if you recommend another one). QA, it's me who deploys to QA, tests with users (or not) and validates manually, same for users." |
| Through which channel? | "Jira, it's through the API, but I think the software must not know the Jira URL or the token, but configurable via a file. Email, messaging and in person, it's me who will report those to you." |
| Exact text or summary? | "Exact history." |

- B7.1 I need to know **that a ticket waits for someone outside**, who, and since when.
- B7.2 I need to **keep the exact history of the exchanges**, attached to the ticket. A summary is not enough.
- B7.3 I need **the exchanges with the back-end**, which is an AI agent, to be attached to the ticket concerned.
- B7.4 I need to **report myself** an exchange received by email, messaging or in person, by simply telling an agent who records it.

**The actors around a ticket**:

| Actor | Nature | How the information arrives |
|---|---|---|
| Me | Human | I work, I report, I decide |
| Agents that handle the tickets | AI | They feed the tracking |
| Back-end | AI agent, reached through an exposed channel | Exchanges to keep word for word |
| QA | Me: I deploy, I test, I validate | I am the one who notes it |
| Users | Humans, in acceptance testing or not | Jira (automatic) or me (email, in person) |
| Jira | External tool | Through its API, configured outside the software |

**What this teaches us**:
- **QA is not a third party**: it is the developer themselves. The steps "QA delivery" and "QA validation" are therefore their own actions, to be recorded.
- **The channel to the back-end is not fixed**: the user is open to a recommendation (a technical question, to be handled in the architecture).
- **Manual entry goes through the conversation**: the developer reports to an agent, who records it.

## M8. I check that a ticket is really done

**Situation**: I am told the ticket is finished.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| What makes you say a ticket is finished? | "Test OK + manual visual test if needed, + user test." |
| Who decides it is finished? | "Me." |
| Which phases count after development? | "Test, QA delivery, QA validation." |

- B8.1 I need to **see the test results** of the ticket.
- B8.2 I need to **note that a manual visual test was done**, when the ticket asks for one.
- B8.3 I need to **follow the user test**: done or not, and its feedback.
- B8.4 **I am the one who declares a ticket finished.** No assignee does it in my place.

**The lifecycle of a ticket**, completed by the user:

```
Analysis → Development → Test → QA delivery → QA validation
```

The glossary adds at the head the phase **To do**, for a ticket not yet started (user's decision, 2026-10-18).

Tracking stops at QA validation; production is not mentioned. In each phase, the situation is always stated by its **progress** and a possible **wait** (see M6).

## M9. I deliver

**Situation**: one or more tickets go to QA or to production.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| How does a delivery go? | "Often a batch of tickets. Producing a changelog can sometimes be useful. Making it configurable through an option in the dashboard may be useful (bonus, not primary)." |
| What is painful? | "NA" (nothing in particular) |

- B9.1 I need to know **which tickets go together** in a QA delivery.
- B9.2 I need to **note that a batch was delivered to QA**, so that each ticket moves on to the next step.
- B9.3 I would like to be able to **produce a changelog** of the delivery, as an option. **Secondary (bonus), according to the user.**

## M10. I step back

**Situation**: at the end of the week, or when I am asked where the project stands.

**The user's answers (2026-10-18)**:

| Question | Answer |
|---|---|
| Are you asked where the project stands? | "No." |
| Do you need to know the cost of AI? | "Yes, I need to know roughly the usage per ticket, and on the dashboard a daily, weekly and monthly usage." |

- ~~B10.1 Say where the project stands to someone~~: **struck out**, nobody asks.
- B10.2 I need to know **AI usage, approximate, per ticket**.
- B10.3 I need to know **overall usage per day, per week and per month**.

## Stated constraints

- **C1. The software contains neither the URL nor the token of Jira.** They are provided by a configuration file (2026-10-18).
- **C2. Jira is read-only, on request.** The import is started by the developer; nothing is written to Jira, and local tickets stay local (2026-10-18).

## Cross-cutting findings

What comes up again and again:

- **T1. Two sources of information.** One part arrives **automatically**: Jira, the agents' work. The other can only come **from me**: feedback received by email or in person, the history of a ticket that is written nowhere. Both must end up in the same place, and my entry must be quick.
- **T2. The changes also come from outside**: a new ticket assigned, a status change, user feedback. The agents' work is only one part of what moves.
- **T3. A ticket has a life before me and outside me.** The tracking must be able to carry that history.
- **T4. Primary and secondary.** The user starts to sort. Count as "bonuses": proposing what comes next (B1.5) and the optional changelog (B9.3).
- **T5. The developer is at once assignee, QA and decider.** Many of the ticket's steps are their own actions, to be recorded as simply as the agents' ones.

## What is missing

Nothing: the user confirms that no moment of their day is missing (2026-10-18).
