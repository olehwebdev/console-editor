import type { z } from 'zod';

/** What an input that isn't an object is called in its message. */
const WHOLE_INPUT = 'not an object';

/**
 * Reads untrusted input (IPC, a file) as `schema`: its known fields only, as fresh copies. Throws
 * the first problem's message; a field of the wrong shape, which has no message of its own, is
 * `Invalid <what>: <field>`.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown, what: string): z.output<S> {
  const result = schema.safeParse(input, { error: (issue) => `Invalid ${what}: ${String(issue.path?.[0] ?? WHOLE_INPUT)}` });
  if (!result.success) throw new Error(result.error.issues[0]!.message);
  return result.data;
}
