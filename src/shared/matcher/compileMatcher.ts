import type { UrlMatcher } from '../types';
import { MATCHER_COMPILERS } from './matcherCompilers';
import { stripQuery } from './stripQuery';
import type { UrlPredicate } from './types';

/** What a match type this build doesn't know compiles to (a newer version's, or a hand edit of overrides.json). */
const MATCHES_NOTHING: UrlPredicate = () => false;

export function compileMatcher(matcher: UrlMatcher): UrlPredicate {
  if (!Object.hasOwn(MATCHER_COMPILERS, matcher.type)) return MATCHES_NOTHING;
  const normalize = matcher.ignoreQuery ? stripQuery : (url: string) => url;
  return MATCHER_COMPILERS[matcher.type](matcher, normalize);
}
