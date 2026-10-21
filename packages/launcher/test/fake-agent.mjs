// A back-end agent without AI, for the tests: it reads its launch text and acts as FAKE_MODE says.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const prompt = readFileSync(0, 'utf8');
const mode = process.env.FAKE_MODE ?? 'edit';
const hold = (file) => {
  try {
    execFileSync(process.execPath, [process.env.TRACKER_HOLD_SCRIPT, file], { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
};
const reply = (status, message, changedFiles = []) =>
  JSON.stringify({
    status,
    message,
    question: null,
    progress: { done: [], remaining: [] },
    changedFiles,
  });

if (mode === 'slow') await new Promise((resolve) => setTimeout(resolve, 10_000));
if (mode === 'prose') process.stdout.write(`Fini, sans JSON. Lu : ${prompt.split('\n')[0]}`);
if (mode === 'edit') {
  hold('api/orders.js');
  appendFileSync('api/orders.js', '// export route\n');
  process.stdout.write(reply('done', 'Route added.', ['api/orders.js']));
}
if (mode === 'sneaky') {
  appendFileSync('api/orders.js', '// no hold\n');
  process.stdout.write(reply('done', 'Done without holding.'));
}
if (mode === 'refused') {
  const ok = hold('api/orders.js');
  process.stdout.write(
    ok ? reply('done', 'Held.') : reply('blocked', 'api/orders.js is held by another ticket.'),
  );
}
if (mode === 'claude') {
  process.stdout.write(
    JSON.stringify({
      result: 'Route added.',
      structured_output: JSON.parse(reply('done', 'Route added.')),
      modelUsage: {
        'model-a': {
          inputTokens: 10,
          outputTokens: 500,
          cacheReadInputTokens: 9000,
          cacheCreationInputTokens: 300,
        },
      },
    }),
  );
}
