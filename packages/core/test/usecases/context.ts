import type { Actor } from '../../src/domain';
import { openDatabase } from '../../src/store';
import type { UsecaseContext } from '../../src/usecases';

export const developer: Actor = { kind: 'developer' };
export const agent: Actor = { kind: 'agent', agentId: 'agent-1' };

const HOUR = 3_600_000;

/** An in-memory tracker whose clock moves one minute at each reading, and can jump. */
export function testContext(actor: Actor = developer): UsecaseContext & {
  advance: (ms: number) => void;
  as: (who: Actor) => UsecaseContext;
} {
  let time = Date.parse('2026-10-19T09:00:00.000Z');
  let id = 0;
  const db = openDatabase(':memory:');
  db.prepare("INSERT INTO agent (id, name, tool) VALUES ('agent-1', 'front-1', 'test')").run();
  const base = {
    db,
    now: (): string => {
      time += 60_000;
      return new Date(time).toISOString();
    },
    newId: (): string => {
      id += 1;
      return `id-${String(id)}`;
    },
    staleAfterMs: 24 * HOUR,
    workingTimeoutMs: 15 * 60_000,
  };
  return {
    ...base,
    actor,
    advance: (ms: number): void => {
      time += ms;
    },
    as: (who: Actor): UsecaseContext => ({ ...base, actor: who }),
  };
}

export const DAY = 24 * HOUR;
