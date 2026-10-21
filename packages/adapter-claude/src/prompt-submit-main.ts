import { z } from 'zod';
import { onPromptSubmit } from './hooks';
import { hookContext, readHookInput } from './runtime';

const input = z.object({ session_id: z.string() }).loose().parse(readHookInput());
void onPromptSubmit(input, hookContext(process.env));
