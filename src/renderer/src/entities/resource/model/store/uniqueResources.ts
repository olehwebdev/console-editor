import type { ResourceEntry } from '@common/types';

/**
 * One entry per URL. When several frames loaded the same file, the page's own
 * entry wins, then same-process iframes, then cross-site iframes.
 */
export function uniqueResources(byKey: Record<string, ResourceEntry>): ResourceEntry[] {
  const rank = (e: ResourceEntry) => (e.frame ? 1 : 0) + (e.iframeId ? 1 : 0);
  const best = new Map<string, ResourceEntry>();
  for (const entry of Object.values(byKey)) {
    const current = best.get(entry.url);
    if (!current || rank(entry) < rank(current) || (!!entry.overrideId && !current.overrideId && rank(entry) === rank(current))) {
      best.set(entry.url, entry);
    }
  }
  return [...best.values()];
}
