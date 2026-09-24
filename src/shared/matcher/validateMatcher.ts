import type { UrlMatcher } from '../types';

/** Returns a human readable error, or null when the matcher is usable. */
export function validateMatcher(matcher: UrlMatcher): string | null {
  if (!matcher.pattern.trim()) return 'Pattern is empty';
  if (matcher.type === 'regex') {
    try {
      new RegExp(matcher.pattern);
    } catch (err) {
      return `Invalid regular expression: ${(err as Error).message}`;
    }
  }
  return null;
}
