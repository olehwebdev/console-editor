import type { UrlMatcher } from '../types';

/** Whether two matchers match the same URLs the same way. */
export function sameMatcher(a: UrlMatcher, b: UrlMatcher): boolean {
  return a.type === b.type && a.pattern === b.pattern && a.ignoreQuery === b.ignoreQuery;
}
