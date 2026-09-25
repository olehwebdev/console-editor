import type { StackHit } from '../../shared/types';
import { MAX_HITS } from './constants';
import { toStackHit } from './toStackHit';

/**
 * What the detector returned, as findings: the page's main world ran it, so its
 * answer is checked like any input. Unknown ids and signals are dropped, and a
 * library found twice keeps its first finding.
 */
export function toStackHits(raw: unknown): StackHit[] {
  if (!Array.isArray(raw)) return [];
  const hits = new Map<string, StackHit>();
  for (const item of raw.slice(0, MAX_HITS)) {
    const hit = toStackHit(item);
    if (hit && !hits.has(hit.id)) hits.set(hit.id, hit);
  }
  return [...hits.values()];
}
