import type { UrlMatcher } from '../types';
import { MATCHER_COMPILERS } from './matcherCompilers';
import { stripQuery } from './stripQuery';
import type { UrlPredicate } from './types';

export function compileMatcher(matcher: UrlMatcher): UrlPredicate {
  // A type this build doesn't know (a newer version's, or a hand edit of overrides.json) matches nothing.
  if (!Object.hasOwn(MATCHER_COMPILERS, matcher.type)) return () => false;
  const normalize = matcher.ignoreQuery ? stripQuery : (url: string) => url;
  return MATCHER_COMPILERS[matcher.type](matcher, normalize);
}
