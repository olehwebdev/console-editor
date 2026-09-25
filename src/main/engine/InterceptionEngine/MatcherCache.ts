import { compileMatcher, type UrlPredicate } from '../../../shared/matcher';
import type { UrlMatcher } from '../../../shared/types';

/** Joins the parts of a matcher cache key: a NUL can't occur in them (a regex may contain `|`). */
const MATCHER_KEY_SEPARATOR = '\u0000';

/**
 * Compiled URL matchers, keyed by the matcher itself rather than its owner's
 * id, so overrides and rules share them and an override id can never collide
 * with a rule id.
 */
export class MatcherCache {
  private readonly predicates = new Map<string, UrlPredicate>();

  predicate(match: UrlMatcher): UrlPredicate {
    const key = [match.type, match.ignoreQuery, match.pattern].join(MATCHER_KEY_SEPARATOR);
    let predicate = this.predicates.get(key);
    if (!predicate) {
      predicate = compileMatcher(match);
      this.predicates.set(key, predicate);
    }
    return predicate;
  }

  clear(): void {
    this.predicates.clear();
  }
}
