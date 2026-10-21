/** The screens of the page, read from the address after `#` (ADR 0028). */
export type Route =
  | { view: 'list'; key: string | null }
  | { view: 'board' }
  | { view: 'summary' }
  | { view: 'novelties' }
  | { view: 'documents' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/tableau') return { view: 'board' };
  if (path === '/bilan') return { view: 'summary' };
  if (path === '/nouveautes') return { view: 'novelties' };
  if (path === '/documents') return { view: 'documents' };
  const ticket = /^\/ticket\/(.+)$/.exec(path);
  return { view: 'list', key: ticket?.[1] ? decodeURIComponent(ticket[1]) : null };
}

export function routeHash(route: Route): string {
  switch (route.view) {
    case 'board':
      return '#/tableau';
    case 'summary':
      return '#/bilan';
    case 'novelties':
      return '#/nouveautes';
    case 'documents':
      return '#/documents';
    case 'list':
      return route.key === null ? '#/' : `#/ticket/${encodeURIComponent(route.key)}`;
  }
}
