import type { UrlMatcher } from '../types';
import type { UrlPredicate } from './types';
import { validateMatcher } from './validateMatcher';

/** An invalid expression matches nothing. */
export function compileRegex(matcher: UrlMatcher, normalize: (url: string) => string): UrlPredicate {
  if (validateMatcher(matcher)) return () => false;
  const re = new RegExp(matcher.pattern);
  return (url) => re.test(normalize(url));
}
