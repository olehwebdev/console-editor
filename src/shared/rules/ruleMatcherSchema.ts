import { urlMatcherSchema } from '../matcher';
import { UNINTERCEPTED_URL } from './constants';

/** A rule's matcher: a usable one that requests can reach. Regex patterns are the user's to get right. */
export const ruleMatcherSchema = urlMatcherSchema.refine((match) => match.type === 'regex' || !UNINTERCEPTED_URL.test(match.pattern.trim()), {
  path: ['pattern'],
  error: 'Requests to ws:, data: and blob: URLs never reach rules',
});
