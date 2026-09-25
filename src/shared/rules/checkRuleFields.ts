import type { RuleAction } from '../types';
import { RULE_INPUT_CHECKS } from './ruleInputChecks';
import type { RuleInputOf } from './types';

/** Checks the fields of the input's own action. Generic so each action reaches its own check without a cast. */
export function checkRuleFields<A extends RuleAction>(input: RuleInputOf<A>): string | null {
  return RULE_INPUT_CHECKS[input.action](input);
}
