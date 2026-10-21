import { z } from 'zod';
import { onSessionStart } from './hooks';
import { hookContext, readHookInput } from './runtime';

const input = z
  .object({ session_id: z.string(), cwd: z.string(), source: z.string().default('startup') })
  .loose()
  .parse(readHookInput());
void onSessionStart(input, hookContext(process.env)).then((output) => {
  process.stdout.write(JSON.stringify(output));
});
