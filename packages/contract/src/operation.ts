import type { z } from 'zod';

/** Who may call an operation: the developer (page, CLI), an agent (MCP, CLI) or the back-end launcher. */
export type Caller = 'developer' | 'agent' | 'launcher';

/**
 * One operation of the catalogue (ADR 0026). The server derives from it an HTTP route,
 * an MCP tool and a CLI command; the logic lives in the matching use case.
 */
export interface Operation<Input extends z.ZodType, Output extends z.ZodType> {
  name: string;
  description: string;
  callers: readonly Caller[];
  /** Reads only: the page is not told that something changed. */
  readOnly?: boolean;
  /** The server answers as soon as the output's `request` is not null, or after `waitSeconds`. */
  longPoll?: boolean;
  input: Input;
  output: Output;
}

export function defineOperation<Input extends z.ZodType, Output extends z.ZodType>(
  operation: Operation<Input, Output>,
): Operation<Input, Output> {
  return operation;
}
