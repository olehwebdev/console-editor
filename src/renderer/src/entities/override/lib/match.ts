import { compileMatcher, type UrlPredicate } from '@common/matcher';
import type { OverrideMeta } from '@common/types';

const cache = new Map<string, UrlPredicate>();

function predicateFor(o: OverrideMeta): UrlPredicate {
  const key = `${o.match.type}\u0000${o.match.ignoreQuery}\u0000${o.match.pattern}`;
  let p = cache.get(key);
  if (!p) {
    p = compileMatcher(o.match);
    cache.set(key, p);
  }
  return p;
}

/** The override that applies to a URL: enabled ones first, then any. */
export function findOverrideFor(url: string, overrides: OverrideMeta[]): OverrideMeta | undefined {
  const matching = overrides.filter((o) => predicateFor(o)(url));
  return matching.find((o) => o.enabled) ?? matching[0];
}

export function matchesUrl(o: OverrideMeta, url: string): boolean {
  return predicateFor(o)(url);
}
