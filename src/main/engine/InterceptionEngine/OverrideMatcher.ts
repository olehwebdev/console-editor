import { compileMatcher, type UrlPredicate } from '../../../shared/matcher';
import type { MatchType, Override } from '../../../shared/types';
import { answersKind } from './answersKind';
import { VERSION_SEPARATOR } from './constants';
import { requestMatches } from './requestMatches';
import { sendsRequest } from './sendsRequest';
import { specificity } from './specificity';
import type { EngineOptions, MatchedRequest } from './types';

const MATCH_RANK = { exact: 0, glob: 1, regex: 2 } as const satisfies Record<MatchType, number>;

/** Joins the parts of a matcher cache key: a NUL can't occur in them (a regex may contain `|`). */
const MATCHER_KEY_SEPARATOR = '\u0000';

/** Picks the override that answers a URL, with each override's compiled matcher cached until {@link clear}. */
export class OverrideMatcher {
  private readonly cache = new Map<string, UrlPredicate>();

  constructor(private readonly opts: Pick<EngineOptions, 'getOverrides'>) {}

  /**
   * Finds the enabled override for a URL. Exact beats glob beats regex; then
   * one naming a GraphQL operation or a method beats one that doesn't; newer
   * beats older. With a `resourceType`, documents, scripts and stylesheets are
   * only answered by an override of their own kind (so a broad pattern can't
   * put JS in a stylesheet or replace a page); `Other` (mostly what workers
   * load as scripts) by script overrides; fetch() and XHR by response
   * overrides whose request match takes `request`, and by script and style
   * overrides; anything else (preload…) by script and style overrides.
   */
  find(url: string, resourceType?: string, request?: MatchedRequest): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matcherFor(o)(url)) continue;
      if (resourceType && !answersKind(o.kind, resourceType)) continue;
      if (!requestMatches(o.request, request)) continue;
      if (!best || this.outranks(o, best)) best = o;
    }
    return best;
  }

  /**
   * The enabled response override that answers `url` for `method` without sending it, whatever GraphQL
   * operation it names: what a CORS preflight asking to send `method` is answered for.
   */
  unsentFor(url: string, resourceType: string, method: string): Override | undefined {
    // A preflight carries no body to name an operation: only the method is asked of the override.
    const preflight: MatchedRequest = { method, operation: () => undefined };
    return this.opts.getOverrides().find((o) => {
      if (!o.enabled || sendsRequest(o) || !answersKind(o.kind, resourceType)) return false;
      return requestMatches(o.request && { method: o.request.method, operation: '' }, preflight) && this.matcherFor(o)(url);
    });
  }

  /** The version of the override that would serve `url` now (`id@updatedAt`), or '' for the live file. */
  version(url: string, resourceType: string): string {
    const o = this.find(url, resourceType);
    return o ? `${o.id}${VERSION_SEPARATOR}${o.updatedAt}` : '';
  }

  /** Drops the compiled matchers (the overrides changed). */
  clear(): void {
    this.cache.clear();
  }

  private outranks(o: Override, best: Override): boolean {
    const byMatch = MATCH_RANK[best.match.type] - MATCH_RANK[o.match.type];
    if (byMatch !== 0) return byMatch > 0;
    const bySpecificity = specificity(o.request) - specificity(best.request);
    if (bySpecificity !== 0) return bySpecificity > 0;
    return o.updatedAt > best.updatedAt;
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
