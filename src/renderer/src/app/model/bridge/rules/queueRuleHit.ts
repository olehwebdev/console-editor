import type { RuleHit } from '@/entities/rule';
import { HIDDEN_FLUSH_MS, NO_FRAME } from '../resources/constants';
import { flushRuleHits } from './flushRuleHits';
import { ruleHitQueue } from './ruleHitQueue';

/** Queues one hit for the next flush: the next frame, or HIDDEN_FLUSH_MS while frames are paused. */
export function queueRuleHit({ ruleId, url }: RuleHit): void {
  ruleHitQueue.hits.push({ ruleId, url });
  if (ruleHitQueue.frame !== NO_FRAME) return;
  ruleHitQueue.frame = requestAnimationFrame(flushRuleHits);
  ruleHitQueue.timer = setTimeout(flushRuleHits, HIDDEN_FLUSH_MS);
}
