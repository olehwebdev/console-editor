import { useRuleStore } from '@/entities/rule';
import { NO_FRAME } from '../resources/constants';
import { ruleHitQueue } from './ruleHitQueue';

/** Counts the queued hits in one store update. Whichever of the frame and the fallback timer runs first cancels the other. */
export function flushRuleHits(): void {
  cancelAnimationFrame(ruleHitQueue.frame);
  clearTimeout(ruleHitQueue.timer);
  ruleHitQueue.frame = NO_FRAME;
  const { hits } = ruleHitQueue;
  ruleHitQueue.hits = [];
  useRuleStore.getState().recordHits(hits);
}
