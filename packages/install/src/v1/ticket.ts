import { priorityFromFiveLevels, type Ticket, type Wait } from '@project-tracker/core/domain';
import type { SituationRecord } from '@project-tracker/core/store';
import type { V1Item, V1Project } from './files';

export function toTicket(item: V1Item, project: V1Project): Ticket {
  const ticket: Ticket = {
    id: item.id,
    key: item.id,
    origin: isJiraKey(item.id, project) ? 'jira' : 'local',
    title: item.title,
    priority: priorityFromFiveLevels(item.priority),
    createdAt: item.createdAt,
  };
  const request = [item.context?.origin, item.context?.request].filter(Boolean).join('\n\n');
  if (request !== '') ticket.initialRequest = request;
  return ticket;
}

/** ADR 0024: an unfinished ticket starts again in "To do"; a finished one is closed at its end date. */
export function toSituation(item: V1Item, project: V1Project): SituationRecord {
  if (isFinished(item, project)) {
    return {
      ticketId: item.id,
      situation: {
        phase: 'qaValidation',
        progress: { state: 'done' },
        closedAt: item.doneAt ?? item.updatedAt,
      },
      wait: null,
      updatedAt: item.updatedAt,
    };
  }
  return {
    ticketId: item.id,
    situation: { phase: 'todo', progress: { state: 'notStarted' } },
    wait: toWait(item, project),
    updatedAt: item.updatedAt,
  };
}

export function partnerLabel(partnerId: string, project: V1Project): string {
  return project.config.partners?.find((partner) => partner.id === partnerId)?.label ?? partnerId;
}

function isJiraKey(key: string, project: V1Project): boolean {
  const tracker = project.config.issueTracker;
  if (tracker?.type !== 'jira' || tracker.keyPattern === undefined) return false;
  return new RegExp(tracker.keyPattern).test(key);
}

function isFinished(item: V1Item, project: V1Project): boolean {
  return item.doneAt !== undefined || project.stageRoles.get(item.stage ?? '') === 'done';
}

function toWait(item: V1Item, project: V1Project): Wait | null {
  const since = item.waitingSince ?? item.updatedAt;
  if (item.blockedBy === 'user') return { kind: 'developer', since };
  if (item.blockedBy?.startsWith('partner:')) {
    const partnerId = item.blockedBy.slice('partner:'.length);
    return { kind: 'partner', since, detail: partnerLabel(partnerId, project) };
  }
  return null;
}
