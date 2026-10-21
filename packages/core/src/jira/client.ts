import { z } from 'zod';
import type { JiraComment, JiraIssue, JiraReader } from '../domain';

/** Where Jira is and who reads it. The URL comes from the configuration, the email and token from the environment. */
export interface JiraConnection {
  baseUrl: string;
  project: string;
  /** Only the children of these issues, when given (ADR 0052); checked as issue keys by the configuration. */
  parents?: readonly string[];
  email: string;
  token: string;
}

/** Jira's rich text (Atlassian Document Format): only its text is kept. */
type RichText =
  | { type?: string | undefined; text?: string | undefined; content?: RichText[] | undefined }
  | string
  | null
  | undefined;
const richText: z.ZodType<RichText> = z.lazy(() =>
  z.union([
    z.string(),
    z.null(),
    z.undefined(),
    z
      .object({
        type: z.string().optional(),
        text: z.string().optional(),
        content: z.array(richText).optional(),
      })
      .loose(),
  ]),
);

const searchPage = z.object({
  issues: z.array(
    z.object({
      key: z.string(),
      fields: z.object({
        summary: z.string(),
        status: z.object({
          name: z.string(),
          statusCategory: z.object({ key: z.string() }).optional(),
        }),
        updated: z.string(),
        description: richText,
        priority: z.object({ name: z.string() }).nullable().optional(),
        duedate: z.string().nullable().optional(),
        comment: z
          .object({
            comments: z.array(
              z.object({
                id: z.string(),
                author: z.object({ displayName: z.string() }).optional(),
                body: richText,
                created: z.string(),
              }),
            ),
          })
          .optional(),
      }),
    }),
  ),
  nextPageToken: z.string().optional(),
  isLast: z.boolean().optional(),
});

const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote']);

/**
 * Reads the issues assigned to the developer in the project. Read-only by construction: this client
 * has no function that writes to Jira, and every request it sends is a GET.
 */
export function jiraReader(connection: JiraConnection, fetchFn: typeof fetch = fetch): JiraReader {
  const authorization = `Basic ${Buffer.from(`${connection.email}:${connection.token}`).toString('base64')}`;
  const base = connection.baseUrl.replace(/\/+$/, '');
  const parentsClause =
    connection.parents && connection.parents.length > 0
      ? ` AND parent in (${connection.parents.join(', ')})`
      : '';
  return async () => {
    const issues: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    do {
      const url = new URL(`${base}/rest/api/3/search/jql`);
      url.searchParams.set(
        'jql',
        `project = "${connection.project}" AND assignee = currentUser()${parentsClause} ORDER BY updated DESC`,
      );
      url.searchParams.set('fields', 'summary,status,updated,description,priority,duedate,comment');
      url.searchParams.set('maxResults', '50');
      if (nextPageToken) url.searchParams.set('nextPageToken', nextPageToken);
      const response = await fetchFn(url, {
        method: 'GET',
        headers: { authorization, accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Jira answered ${String(response.status)}`);
      const page = searchPage.parse(await response.json());
      issues.push(...page.issues.map((issue) => toIssue(base, issue)));
      nextPageToken = page.isLast === false ? page.nextPageToken : undefined;
    } while (nextPageToken);
    return issues;
  };
}

function toIssue(base: string, issue: z.infer<typeof searchPage>['issues'][number]): JiraIssue {
  const comments: JiraComment[] = (issue.fields.comment?.comments ?? []).map((comment) => ({
    id: comment.id,
    author: comment.author?.displayName ?? 'Jira',
    body: plainText(comment.body),
    createdAt: new Date(comment.created).toISOString(),
  }));
  return {
    key: issue.key,
    title: issue.fields.summary,
    status: issue.fields.status.name,
    done: issue.fields.status.statusCategory?.key === 'done',
    url: `${base}/browse/${issue.key}`,
    description: plainText(issue.fields.description),
    ...(issue.fields.priority ? { priority: issue.fields.priority.name } : {}),
    ...(issue.fields.duedate ? { dueDate: issue.fields.duedate } : {}),
    comments,
    updatedAt: new Date(issue.fields.updated).toISOString(),
  };
}

function plainText(node: RichText): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  const inner = (node.content ?? []).map(plainText).join('');
  const text = (node.text ?? '') + inner;
  if (node.type === 'doc') return text.trim();
  return BLOCKS.has(node.type ?? '') ? `${text}\n` : text;
}
