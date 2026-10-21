# 0035. Attachments on a ticket

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (sub-step 13b)
- Links: [features.md](../product/features.md) F30; [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0024](0024-migration-des-donnees-v1.md), [0027](0027-authentification-du-developpeur.md), [0030](0030-installation-dans-un-projet.md); [step 13 plan](../plan/etape-13.md)

## Context

F30: attach a screenshot or a file to a ticket, see it in the conversation, and let agents read it. The `attachment` table exists (ADR 0015) and the V1 migration already stores attachments there, next to the database.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Storage | **Next to the database**, `tools/tracker/attachments/<ticket>/` (recommended); in the database | Next to the database |
| 2. Accepted files | **Any file, 20 MB at most** (recommended); images only, 10 MB | Any file, 20 MB |
| 3. Adding from the page | **Button, pasting an image, drag and drop** (recommended); button only | All three |
| 4. Reading by agents | **Disk path and HTTP address** (recommended); path only | Path and address |

## Decision

- Files go in `tools/tracker/attachments/<ticket>/`, ignored by git. **Backup and update copy this folder with the database.**
- **Any file up to 20 MB.** Common images (PNG, JPEG, GIF, WebP) display in the conversation; other files, SVG included, are links to download, never displayed in the page (an SVG can carry script).
- **From the page**: the "Joindre une capture" button, pasting an image into the message area and drag and drop. The attachments go with the message; the message received by the assignee names them, with their path and address.
- **For agents**: the ticket record gives for each attachment its disk path and its HTTP address, readable with a token. Agents attach a file through the CLI (`tracker attach <ticket> <file>`).
- Sending goes through a separate HTTP route, `POST /api/attachments` (raw content), with the same checks as the rest of the API (token, `Host`); reading through `GET /api/attachments/<id>`.

## Consequences

- An attachment is linked to the journal entry that carried it (message, agent entry).
- The manual backup and the one before an update become a folder: the database and the attachments.
