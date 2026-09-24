import { toCdpUrlPattern } from '../../../shared/matcher';
import type { Override, Settings } from '../../../shared/types';
import { ANY_URL, DOCUMENT_KIND, OTHER_RESOURCE_TYPE, SCRIPT_KIND } from './constants';
import type { FetchPattern } from './types';

/** Joins a pattern and its resource type into the key patterns are deduplicated by. */
const KEY_SEPARATOR = '|';

/**
 * Pauses only the requests that an override (or SRI stripping) could apply to.
 * Exact/glob overrides get a precise URL pattern; regex overrides fall back to
 * "every request of this resource type". Workers load scripts as `Other` too
 * (a worker's first script, static module imports), so script overrides also
 * pause those.
 */
export function computeFetchPatterns(overrides: Override[], settings: Settings): FetchPattern[] {
  const patterns = new Map<string, FetchPattern>();
  const add = (p: FetchPattern) => patterns.set(`${p.urlPattern}${KEY_SEPARATOR}${p.resourceType ?? ''}`, p);
  const enabled = overrides.filter((o) => o.enabled);
  for (const o of enabled) {
    const urlPattern = toCdpUrlPattern(o.match);
    if (urlPattern !== ANY_URL) {
      add({ urlPattern, requestStage: 'Response' });
      continue;
    }
    add({ urlPattern, resourceType: o.kind, requestStage: 'Response' });
    if (o.kind === SCRIPT_KIND) add({ urlPattern, resourceType: OTHER_RESOURCE_TYPE, requestStage: 'Response' });
  }
  if (settings.stripIntegrity && enabled.some((o) => o.kind !== DOCUMENT_KIND)) {
    add({ urlPattern: ANY_URL, resourceType: DOCUMENT_KIND, requestStage: 'Response' });
  }
  return [...patterns.values()];
}
