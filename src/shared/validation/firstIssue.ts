import type { z } from 'zod';

/** What is wrong with `value` as `schema` reads it: its first problem's message, or null when there is none. */
export function firstIssue(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]!.message;
}
