import { describe, expect, it } from 'vitest';
import { findOverlaps } from '../../src/domain';

describe('overlap', () => {
  it('reports a file changed by two tickets', () => {
    expect(
      findOverlaps([
        { ticketId: 't1', paths: ['src/a.ts', 'src/b.ts'] },
        { ticketId: 't2', paths: ['src/b.ts'] },
      ]),
    ).toEqual([{ path: 'src/b.ts', ticketIds: ['t1', 't2'] }]);
  });

  it('reports nothing when tickets touch different files', () => {
    expect(
      findOverlaps([
        { ticketId: 't1', paths: ['src/a.ts'] },
        { ticketId: 't2', paths: ['src/b.ts'] },
      ]),
    ).toEqual([]);
  });

  it('ignores a file listed twice by the same ticket', () => {
    expect(findOverlaps([{ ticketId: 't1', paths: ['src/a.ts', 'src/a.ts'] }])).toEqual([]);
  });
});
