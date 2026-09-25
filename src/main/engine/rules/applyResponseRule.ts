import { RESPONSE_RULE_APPLIERS } from './responseRuleAppliers';
import type { PausedRequest, ResponseHead, ResponseRuleAction, ResponseRuleOf } from './types';

/** Applies one rule to a response head. Generic so each action reaches its own applier without a cast. */
export function applyResponseRule<A extends ResponseRuleAction>(head: ResponseHead, rule: ResponseRuleOf<A>, request: PausedRequest): ResponseHead {
  return RESPONSE_RULE_APPLIERS[rule.action](head, rule, request);
}
