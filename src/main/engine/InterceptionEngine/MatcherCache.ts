import { compileMatcher, type UrlPredicate } from '../../../shared/matcher';
import type { UrlMatcher } from '../../../shared/types';

/**
 * Compiled URL matchers, keyed by the matcher object itself: the stores hand
 * the engine the same objects until something changes, so a paused request
 * looks each one up without building a key. Overrides and rules share it.
 */
export class MatcherCache {
  private predicates = new WeakMap<UrlMatcher, UrlPredicate>();

  predicate(match: UrlMatcher): UrlPredicate {
    let predicate = this.predicates.get(match);
    if (!predicate) {
      predicate = compileMatcher(match);
      this.predicates.set(match, predicate);
    }
    return predicate;
  }

  clear(): void {
    this.predicates = new WeakMap();
  }
}
