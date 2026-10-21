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
            summary: 'Afficher la date de commande au format local',
            status: { name: 'To Do' },
            updated: '2026-10-19T08:00:00.000Z',
            description:
              'Sur la liste des commandes, la date doit suivre le format local (jour/mois/année).',
            comment: {
              comments: [
                {
                  id: '1',
                  author: { displayName: 'Responsable produit' },
                  body: 'Garder la colonne triable.',
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
