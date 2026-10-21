import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from '../src/lib/route';

describe('the address of a screen (ADR 0028)', () => {
  it('opens the list when the address names no screen', () => {
    expect(parseRoute('')).toEqual({ view: 'list', key: null });
  });

  it('opens a ticket from its address, so the back button returns to it', () => {
    expect(parseRoute('#/ticket/PROJ-12')).toEqual({ view: 'list', key: 'PROJ-12' });
  });

  it('reads back every address it writes', () => {
    for (const route of [
      { view: 'list', key: null },
      { view: 'list', key: 'LOC 3' },
      { view: 'board' },
      { view: 'summary' },
      { view: 'novelties' },
      { view: 'documents' },
    ] as const) {
      expect(parseRoute(routeHash(route))).toEqual(route);
    }
  });
});
