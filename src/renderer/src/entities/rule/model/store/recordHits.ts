import { MAX_RECENT_REQUESTS } from './constants';
import type { RecentRequest, RuleHit, RuleHitState } from './types';

/**
 * Counts a batch of hits, oldest first, and moves each URL to the front of its rule's recent
 * requests (one entry per URL, at most MAX_RECENT_REQUESTS). Pure: returns new records, and
 * keeps the lists of rules the batch didn't touch.
 */
export function recordHits(hits: Record<string, number>, recent: Record<string, RecentRequest[]>, batch: readonly RuleHit[], now: number): RuleHitState {
  const nextHits = { ...hits };
  const nextRecent = { ...recent };
  for (const { ruleId, url } of batch) {
    nextHits[ruleId] = (nextHits[ruleId] ?? 0) + 1;
    const list = nextRecent[ruleId] ?? [];
    const previous = list.find((r) => r.url === url);
    const others = list.filter((r) => r !== previous);
    nextRecent[ruleId] = [{ url, count: (previous?.count ?? 0) + 1, lastAt: now }, ...others].slice(0, MAX_RECENT_REQUESTS);
  }
  return { hits: nextHits, recent: nextRecent };
}
