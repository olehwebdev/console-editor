import { compileMatcher, type UrlPredicate } from '@common/matcher';
import type { OverrideMeta } from '@common/types';

/** Separates a rule's fields in its cache key (NUL, which patterns don't contain). */
const KEY_SEPARATOR = '\u0000';

const cache = new Map<string, UrlPredicate>();

export function predicateFor(o: OverrideMeta): UrlPredicate {
  const key = `${o.match.type}${KEY_SEPARATOR}${o.match.ignoreQuery}${KEY_SEPARATOR}${o.match.pattern}`;
  let p = cache.get(key);
  if (!p) {
    p = compileMatcher(o.match);
    cache.set(key, p);
  }
  return p;
}
