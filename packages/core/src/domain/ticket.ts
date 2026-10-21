import type { Priority } from './priority';
import type { TicketSize } from './suggest';
import type { Instant } from './time';

export type Origin = 'jira' | 'local';

export interface Ticket {
  id: string;
  key: string;
  origin: Origin;
  title: string;
  priority: Priority;
  /** YYYY-MM-DD; from Jira for a Jira ticket (ADR 0038). */
  dueDate?: string;
  size?: TicketSize;
  initialRequest?: string;
  jiraUrl?: string;
  jiraStatus?: string;
  groupId?: string;
  createdAt: Instant;
}
