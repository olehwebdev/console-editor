import { z } from 'zod';
import { HEADER_VALUE_BREAK, MAX_HEADER_VALUE_CHARS } from './constants';
import type { HeaderValueSchemas } from './types';

/** What each header operation accepts as a value. */
export const HEADER_VALUE_SCHEMAS: HeaderValueSchemas = {
  set: z
    .string()
    .refine((value) => !HEADER_VALUE_BREAK.test(value), { error: "Header values can't contain line breaks" })
    .max(MAX_HEADER_VALUE_CHARS, { error: `Header values are at most ${MAX_HEADER_VALUE_CHARS} characters` }),
  remove: z.string().max(0, { error: 'A removed header takes no value' }),
};
