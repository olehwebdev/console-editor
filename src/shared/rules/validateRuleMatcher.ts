import { validateMatcher } from '../matcher';
import type { UrlMatcher } from '../types';
import { UNINTERCEPTED_URL } from './constants';

/** A matcher's problem as a rule's matcher, or null. Regex patterns are the user's to get right. */
export function validateRuleMatcher(match: UrlMatcher): string | null {
  const error = validateMatcher(match);
  if (error) return error;
  if (match.type !== 'regex' && UNINTERCEPTED_URL.test(match.pattern.trim())) return 'Requests to ws:, data: and blob: URLs never reach rules';
  return null;
}
