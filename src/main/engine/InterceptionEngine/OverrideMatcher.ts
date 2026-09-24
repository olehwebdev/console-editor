import { compileMatcher, type UrlPredicate } from '../../../shared/matcher';
import type { MatchType, Override } from '../../../shared/types';
import { answersKind } from './answersKind';
import type { EngineOptions } from './types';

const MATCH_RANK = { exact: 0, glob: 1, regex: 2 } as const satisfies Record<MatchType, number>;

/** Joins the parts of a matcher cache key: a NUL can't occur in them (a regex may contain `|`). */
const MATCHER_KEY_SEPARATOR = '\u0000';

/** Picks the override that answers a URL, with each override's compiled matcher cached until {@link clear}. */
export class OverrideMatcher {
  private readonly cache = new Map<string, UrlPredicate>();

  constructor(private readonly opts: Pick<EngineOptions, 'getOverrides'>) {}

  /**
   * Finds the enabled override for a URL. Exact beats glob beats regex; newer
   * beats older. With a `resourceType`, documents, scripts and stylesheets are
   * only answered by an override of their own kind (so a broad pattern can't
   * put JS in a stylesheet or replace a page); other requests (fetch, XHR,
   * preload) by script and style overrides.
   */
  find(url: string, resourceType?: string): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matcherFor(o)(url)) continue;
      if (resourceType && !answersKind(o.kind, resourceType)) continue;
      if (
        !best ||
        MATCH_RANK[o.match.type] < MATCH_RANK[best.match.type] ||
        (MATCH_RANK[o.match.type] === MATCH_RANK[best.match.type] && o.updatedAt > best.updatedAt)
      ) {
        best = o;
      }
    }
    return best;
  }

  /** Drops the compiled matchers (the overrides changed). */
  clear(): void {
    this.cache.clear();
  }

  private matcherFor(o: Override): UrlPredicate {
    const key = [o.id, o.match.type, o.match.ignoreQuery, o.match.pattern].join(MATCHER_KEY_SEPARATOR);
    let predicate = this.cache.get(key);
    if (!predicate) {
      predicate = compileMatcher(o.match);
      this.cache.set(key, predicate);
    }
    return predicate;
  }
}
