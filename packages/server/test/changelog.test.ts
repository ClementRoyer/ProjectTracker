import { describe, expect, it } from 'vitest';
import { withSection } from '../src/changelog';

const section = {
  name: 'Livraison du 20 oct.',
  at: '2026-10-20T10:00:00.000Z',
  lines: [
    { key: 'LOC-1', line: 'Search customers by their name' },
    { key: 'LOC-2', line: 'Export orders as CSV' },
  ],
};

describe('the changelog file (ADR 0037)', () => {
  it('starts a missing file with its title and the delivery', () => {
    expect(withSection(null, section)).toBe(
      '# Changelog\n\n## Livraison du 20 oct. (2026-10-20)\n\n- LOC-1 : Search customers by their name\n- LOC-2 : Export orders as CSV\n',
    );
  });

  it('puts the newest delivery first, under the title, keeping what was there', () => {
    const existing =
      '# Changelog\n\n## Livraison du 14 oct. (2026-10-14)\n\n- LOC-0 : Fix the logo\n';
    expect(withSection(existing, section)).toBe(
      '# Changelog\n\n## Livraison du 20 oct. (2026-10-20)\n\n- LOC-1 : Search customers by their name\n- LOC-2 : Export orders as CSV\n\n## Livraison du 14 oct. (2026-10-14)\n\n- LOC-0 : Fix the logo\n',
    );
  });

  it('puts the delivery at the top of a file without a title', () => {
    expect(withSection('Old notes\n', section).startsWith('## Livraison du 20 oct.')).toBe(true);
  });
});
