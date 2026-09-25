import { z } from 'zod';
import { HEADER_OPERATIONS, type HeaderEdit } from '../types';
import { headerNameSchema } from './headerNameSchema';
import { HEADER_VALUE_SCHEMAS } from './headerValueSchemas';

/** One header change: a known operation, a name a rule may use, and the value its operation takes. */
export const headerEditSchema = z.toZod<HeaderEdit>()(
  z
    .object({
      operation: z.enum(HEADER_OPERATIONS, { error: 'Unknown header operation' }),
      name: headerNameSchema,
      value: z.string(),
    })
    .check((ctx) => {
      const { operation, value } = ctx.value;
      const issue = HEADER_VALUE_SCHEMAS[operation].safeParse(value).error?.issues[0];
      if (issue) ctx.issues.push({ code: 'custom', input: value, path: ['value'], message: issue.message });
    }),
);
