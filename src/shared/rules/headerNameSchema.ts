import { z } from 'zod';
import { HEADER_NAME, MAX_HEADER_NAME_CHARS, PROTECTED_HEADERS } from './constants';

/** A header name a rule may use: an RFC 9110 token, and none of the headers rules can't change (with the reason). */
export const headerNameSchema = z
  .string()
  .min(1, { error: 'Enter a header name' })
  .max(MAX_HEADER_NAME_CHARS, { error: `Header names are at most ${MAX_HEADER_NAME_CHARS} characters` })
  .regex(HEADER_NAME, { error: "Header names can't contain spaces or ':'" })
  .refine((name) => !Object.hasOwn(PROTECTED_HEADERS, name.toLowerCase()), { error: (issue) => PROTECTED_HEADERS[String(issue.input).toLowerCase()] });
