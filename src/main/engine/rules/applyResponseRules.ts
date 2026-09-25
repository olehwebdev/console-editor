import { applyResponseRule } from './applyResponseRule';
import { sameHead } from './sameHead';
import type { PausedRequest, ResponseHead, ResponseRule, RuledHead } from './types';

/**
 * Applies rules to a response head in order (oldest first, so a newer rule's
 * `set` wins), noting each rule that actually changed it: a rule that changes
 * nothing is not applied, and gets no hit.
 */
export function applyResponseRules(head: ResponseHead, rules: readonly ResponseRule[], request: PausedRequest): RuledHead {
  const applied: string[] = [];
  let current = head;
  for (const rule of rules) {
    const next = applyResponseRule(current, rule, request);
    if (!sameHead(next, current)) applied.push(rule.id);
    current = next;
  }
  return { head: current, applied };
}
