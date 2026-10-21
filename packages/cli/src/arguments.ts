import { parseArgs } from 'node:util';
import { z } from 'zod';

/** One option of a command, read from the operation's input schema. */
interface Field {
  path: string[];
  /** `none`: `--field none` sets a nullable object to null (for example `--wait none`). */
  kind: 'string' | 'number' | 'boolean' | 'list' | 'none';
}

/** `createTicket` → `create-ticket`. */
export function commandName(operationName: string): string {
  return operationName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** The options of a command: scalar fields, lists (repeated option), nested fields with a dot. */
export function fieldsOf(input: z.ZodType): Field[] {
  if (!(input instanceof z.ZodObject)) return [];
  return Object.entries(input.shape as Record<string, z.ZodType>).flatMap(([name, schema]) => {
    const fields = fieldsAt([name], unwrap(schema));
    const nullable = fields.some((field) => field.path.length > 1) && isNullable(schema);
    return nullable ? [{ path: [name], kind: 'none' as const }, ...fields] : fields;
  });
}

function isNullable(schema: z.ZodType): boolean {
  return schema.safeParse(null).success;
}

function fieldsAt(path: string[], schema: z.ZodType): Field[] {
  if (
    schema instanceof z.ZodString ||
    schema instanceof z.ZodEnum ||
    schema instanceof z.ZodLiteral
  ) {
    return [{ path, kind: 'string' }];
  }
  if (schema instanceof z.ZodNumber) return [{ path, kind: 'number' }];
  if (schema instanceof z.ZodBoolean) return [{ path, kind: 'boolean' }];
  if (schema instanceof z.ZodArray) return [{ path, kind: 'list' }];
  const variants =
    schema instanceof z.ZodDiscriminatedUnion ? (schema.options as z.ZodType[]) : [schema];
  const nested = variants.flatMap((variant) =>
    variant instanceof z.ZodObject
      ? Object.entries(variant.shape as Record<string, z.ZodType>).flatMap(([name, inner]) =>
          fieldsAt([...path, name], unwrap(inner)),
        )
      : [],
  );
  const unique = new Map(nested.map((field) => [field.path.join('.'), field]));
  return [...unique.values()];
}

function unwrap(schema: z.ZodType): z.ZodType {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrap(schema.unwrap() as z.ZodType);
  }
  return schema;
}

/** Builds the operation input from the command line; `none` sets a nullable field to null. */
export function readInput(input: z.ZodType, args: readonly string[]): Record<string, unknown> {
  const fields = fieldsOf(input);
  const options = Object.fromEntries(
    fields.map((field) => [
      field.path.join('.'),
      {
        type: field.kind === 'boolean' ? ('boolean' as const) : ('string' as const),
        multiple: field.kind === 'list',
      },
    ]),
  );
  const parsed = parseArgs({ args: [...args], options, allowPositionals: true, strict: true });
  const result: Record<string, unknown> = {};
  const [key] = parsed.positionals;
  if (key !== undefined && fields.some((field) => field.path[0] === 'key')) result.key = key;
  for (const field of fields) {
    const value = (parsed.values as Record<string, unknown>)[field.path.join('.')];
    if (value === undefined) continue;
    if (field.kind === 'none') {
      if (value === 'none') result[field.path.join('.')] = null;
      continue;
    }
    place(result, field.path, field.kind === 'number' ? Number(value) : value);
  }
  return result;
}

function place(target: Record<string, unknown>, path: readonly string[], value: unknown): void {
  const [head, ...rest] = path;
  if (head === undefined) return;
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  const child = target[head];
  const next: Record<string, unknown> =
    typeof child === 'object' && child !== null ? (child as Record<string, unknown>) : {};
  target[head] = next;
  place(next, rest, value);
}
