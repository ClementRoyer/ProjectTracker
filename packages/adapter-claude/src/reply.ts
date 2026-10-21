import { frontReply, type FrontReply } from '@project-tracker/contract';

/** The reduced end-of-turn reply of a front agent (ADR 0020): its last JSON block, else the whole text. */
export function readReply(message: string): { reply: FrontReply } | { raw: string } {
  const blocks = [...message.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(
    (match) => match[1] ?? '',
  );
  const last = blocks.at(-1);
  if (last !== undefined) {
    try {
      const parsed = frontReply.safeParse(JSON.parse(last));
      if (parsed.success) return { reply: parsed.data };
    } catch {
      // Not JSON: the whole message is kept as it is.
    }
  }
  return { raw: message };
}
