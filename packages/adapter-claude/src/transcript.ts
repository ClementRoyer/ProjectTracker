import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

const assistantLine = z.object({
  type: z.literal('assistant'),
  message: z.object({
    id: z.string(),
    model: z.string(),
    usage: z.object({
      input_tokens: z.number().default(0),
      output_tokens: z.number().default(0),
      cache_read_input_tokens: z.number().default(0),
      cache_creation_input_tokens: z.number().default(0),
    }),
  }),
});

type UsageLine = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

/**
 * The tokens of the assistant messages not counted yet, summed by model (ADR 0012, measured).
 * A message can appear on several lines of the transcript: it is counted once, by its id.
 */
export function usageSince(
  transcript: string,
  seen: ReadonlySet<string>,
): { usage: UsageLine[]; messageIds: string[] } {
  if (!existsSync(transcript)) return { usage: [], messageIds: [] };
  const byModel = new Map<string, UsageLine>();
  const ids = new Set<string>();
  for (const text of readFileSync(transcript, 'utf8').split('\n')) {
    const line = parseLine(text);
    if (!line || seen.has(line.message.id) || ids.has(line.message.id)) continue;
    ids.add(line.message.id);
    const total = byModel.get(line.message.model) ?? {
      model: line.message.model,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    total.inputTokens += line.message.usage.input_tokens;
    total.outputTokens += line.message.usage.output_tokens;
    total.cacheReadTokens += line.message.usage.cache_read_input_tokens;
    total.cacheWriteTokens += line.message.usage.cache_creation_input_tokens;
    byModel.set(line.message.model, total);
  }
  return { usage: [...byModel.values()], messageIds: [...ids] };
}

function parseLine(text: string): z.infer<typeof assistantLine> | null {
  if (text.trim() === '') return null;
  try {
    const parsed = assistantLine.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
