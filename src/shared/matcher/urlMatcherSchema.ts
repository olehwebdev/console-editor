import { z } from 'zod';
import { MATCH_TYPES, type UrlMatcher } from '../types';

/**
 * A matcher that can be used: a known type, a pattern that isn't blank and, for a regex, one that
 * compiles. Unknown keys are dropped.
 */
export const urlMatcherSchema = z.toZod<UrlMatcher>()(
  z
    .object({
      type: z.enum(MATCH_TYPES),
      pattern: z.string().refine((pattern) => pattern.trim() !== '', { error: 'Pattern is empty' }),
      ignoreQuery: z.boolean(),
    })
    .check((ctx) => {
      if (ctx.value.type !== 'regex') return;
      try {
        new RegExp(ctx.value.pattern);
      } catch (err) {
        ctx.issues.push({ code: 'custom', input: ctx.value.pattern, path: ['pattern'], message: `Invalid regular expression: ${(err as Error).message}` });
      }
    }),
);
