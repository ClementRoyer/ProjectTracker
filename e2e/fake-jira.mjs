// A fake Jira for the end-to-end journey: one issue assigned to the developer, GET only.
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 9681);
createServer((request, response) => {
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.end();
    return;
  }
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      isLast: true,
      issues: [
        {
          key: 'DEMO-1',
          fields: {
            summary: 'Show the order date in the local format',
            status: { name: 'To Do' },
            updated: '2026-10-19T08:00:00.000Z',
            description:
              'On the order list, the date must follow the local format (day/month/year).',
            comment: {
              comments: [
                {
                  id: '1',
                  author: { displayName: 'Product owner' },
                  body: 'Keep the column sortable.',
                  created: '2026-10-18T10:00:00.000Z',
                },
              ],
            },
          },
        },
      ],
    }),
  );
}).listen(port, '127.0.0.1');
