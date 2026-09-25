import type { UrlMatcher } from '../types';
import type { UrlPredicate } from './types';
import { urlMatcherSchema } from './urlMatcherSchema';

/** An invalid expression matches nothing. */
export function compileRegex(matcher: UrlMatcher, normalize: (url: string) => string): UrlPredicate {
  if (!urlMatcherSchema.safeParse(matcher).success) return () => false;
  const re = new RegExp(matcher.pattern);
  return (url) => re.test(normalize(url));
}
