import type { RuleHit } from '@/entities/rule';
import { NO_FRAME } from '../resources/constants';

/**
 * Rule hits waiting for the next flush: a page firing beacons applies a rule many times a
 * second, one message each, and every store update re-renders the counters. Mutated in place
 * (importers can't reassign another module's bindings).
 */
export const ruleHitQueue: { hits: RuleHit[]; frame: number; timer: ReturnType<typeof setTimeout> | undefined } = {
  hits: [],
  frame: NO_FRAME,
  timer: undefined,
};
