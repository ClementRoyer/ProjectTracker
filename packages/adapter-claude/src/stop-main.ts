import { z } from 'zod';
import { onStop } from './hooks';
import { hookContext, readHookInput } from './runtime';

const input = z
  .object({
    session_id: z.string(),
    transcript_path: z.string().default(''),
    last_assistant_message: z.string().optional(),
    stop_hook_active: z.boolean().default(false),
  })
  .loose()
  .parse(readHookInput());
void onStop(input, hookContext(process.env));
