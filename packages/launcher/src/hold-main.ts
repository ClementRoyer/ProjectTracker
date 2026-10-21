import { relative, resolve } from 'node:path';
import { holdFile } from './locks';

// `hold <file>`: the command a back-end agent runs before changing a file of the mirror (ADR 0010).
const [file] = process.argv.slice(2);
const env = process.env;
if (
  !file ||
  !env.TRACKER_LOCKS ||
  !env.TRACKER_MIRROR ||
  !env.TRACKER_TICKET ||
  !env.TRACKER_EXECUTION
) {
  process.stderr.write(
    'Usage: hold <mirror file> (run by the launcher, which provides its environment)\n',
  );
  process.exit(2);
}
const path = relative(env.TRACKER_MIRROR, resolve(process.cwd(), file));
const held = holdFile(env.TRACKER_LOCKS, path, {
  key: env.TRACKER_TICKET,
  executionId: env.TRACKER_EXECUTION,
});
if (held.ok) {
  process.stdout.write(`OK: ${path} is held by ${env.TRACKER_TICKET}. You can change it.\n`);
} else {
  process.stdout.write(
    `REFUSED: ${path} is held by ticket ${held.heldBy}. Do not change it; reply with the status blocked.\n`,
  );
  process.exitCode = 1;
}
