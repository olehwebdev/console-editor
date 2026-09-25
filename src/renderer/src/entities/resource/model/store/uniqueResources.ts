import type { ResourceEntry } from '@common/types';

/** A worker's entry ranks after the page's (0) and every iframe's (1 same-process, 2 cross-site). */
const WORKER_RANK = 3;

/**
 * One entry per URL. When several frames or workers loaded the same file, the
 * page's own entry wins, then same-process iframes, then cross-site iframes,
 * then workers.
 */
export function uniqueResources(byKey: Record<string, ResourceEntry>): ResourceEntry[] {
  const rank = (e: ResourceEntry) => (e.worker ? WORKER_RANK : (e.frame ? 1 : 0) + (e.iframeId ? 1 : 0));
  const best = new Map<string, ResourceEntry>();
  for (const entry of Object.values(byKey)) {
    const current = best.get(entry.url);
    if (!current || rank(entry) < rank(current) || (!!entry.overrideId && !current.overrideId && rank(entry) === rank(current))) {
      best.set(entry.url, entry);
    }
  }
  return [...best.values()];
}
