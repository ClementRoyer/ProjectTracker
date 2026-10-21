import type { Instant } from './time';

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  createdAt: Instant;
}

/** A Jira issue as read for the developer: what the tool keeps of it, in plain text. */
export interface JiraIssue {
  key: string;
  title: string;
  status: string;
  url: string;
  description: string;
  /** Jira's priority name (Highest…Lowest, or a custom one); the tool keeps it only at creation (ADR 0032). */
  priority?: string;
  /** YYYY-MM-DD, when Jira has one. */
  dueDate?: string;
  comments: JiraComment[];
  updatedAt: Instant;
}

/** Reads the issues assigned to the developer; read-only by construction. */
export type JiraReader = () => Promise<JiraIssue[]>;
