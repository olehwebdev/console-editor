import { compileMatcher, type UrlPredicate } from '@common/matcher';
import type { UrlMatcher } from '@common/types';
import { MATCHER_KEY_SEPARATOR } from './constants';

/** Compiled matchers by their fields: overrides and rules with the same matcher share one. */
const cache = new Map<string, UrlPredicate>();

/** Tests URLs against a matcher, compiling it once. For saved matchers: every distinct one stays cached. */
export function predicateFor(match: UrlMatcher): UrlPredicate {
  const key = [match.type, match.ignoreQuery, match.pattern].join(MATCHER_KEY_SEPARATOR);
  let predicate = cache.get(key);
  if (!predicate) {
    predicate = compileMatcher(match);
    cache.set(key, predicate);
  }
  return predicate;
}
