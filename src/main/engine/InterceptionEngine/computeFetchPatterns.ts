import { CDP_WILDCARD, toCdpUrlPattern } from '../../../shared/matcher';
import type { Override, Settings } from '../../../shared/types';
import { DOCUMENT_KIND } from './constants';
import type { FetchPattern } from './types';

/** A CDP URL pattern matching every request (all `toCdpUrlPattern` can offer a regex). */
const ANY_URL = CDP_WILDCARD;
/** Joins a pattern and its resource type into the key patterns are deduplicated by. */
const KEY_SEPARATOR = '|';

/**
 * Pauses only the requests that an override (or SRI stripping) could apply to.
 * Exact/glob overrides get a precise URL pattern; regex overrides fall back to
 * "every request of this resource type".
 */
export function computeFetchPatterns(overrides: Override[], settings: Settings): FetchPattern[] {
  const patterns = new Map<string, FetchPattern>();
  const add = (p: FetchPattern) => patterns.set(`${p.urlPattern}${KEY_SEPARATOR}${p.resourceType ?? ''}`, p);
  const enabled = overrides.filter((o) => o.enabled);
  for (const o of enabled) {
    const urlPattern = toCdpUrlPattern(o.match);
    add({ urlPattern, resourceType: urlPattern === ANY_URL ? o.kind : undefined, requestStage: 'Response' });
  }
  if (settings.stripIntegrity && enabled.some((o) => o.kind !== DOCUMENT_KIND)) {
    add({ urlPattern: ANY_URL, resourceType: DOCUMENT_KIND, requestStage: 'Response' });
  }
  return [...patterns.values()];
}
