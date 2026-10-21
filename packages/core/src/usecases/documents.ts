import type * as op from '@project-tracker/contract';
import { fail, ok, type Result } from '../domain';
import type { InputOf, OutputOf, UsecaseContext, UsecaseError } from './context';

/** The reference documents of the project (ADR 0040); none when the configuration names none. */
export function listDocuments(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listDocuments>,
): Result<OutputOf<typeof op.listDocuments>, UsecaseError> {
  return ok({ documents: (ctx.documents?.list() ?? []).map((path) => ({ path })) });
}

/** Only a document the configuration names can be read. */
export function readDocument(
  ctx: UsecaseContext,
  input: InputOf<typeof op.readDocument>,
): Result<OutputOf<typeof op.readDocument>, UsecaseError> {
  if (!(ctx.documents?.list() ?? []).includes(input.path)) return fail('documentNotFound');
  const content = ctx.documents?.read(input.path) ?? null;
  return content === null ? fail('documentNotFound') : ok({ path: input.path, content });
}
