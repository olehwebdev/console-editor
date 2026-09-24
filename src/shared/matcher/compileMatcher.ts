import type { UrlMatcher } from '../types';
import { MATCHER_COMPILERS } from './matcherCompilers';
import { stripQuery } from './stripQuery';
import type { UrlPredicate } from './types';

export function compileMatcher(matcher: UrlMatcher): UrlPredicate {
  const normalize = matcher.ignoreQuery ? stripQuery : (url: string) => url;
  return MATCHER_COMPILERS[matcher.type](matcher, normalize);
}
