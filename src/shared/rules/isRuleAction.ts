import { RULE_ACTIONS, type RuleAction } from '../types';

export function isRuleAction(value: unknown): value is RuleAction {
  return RULE_ACTIONS.includes(value as RuleAction);
}
