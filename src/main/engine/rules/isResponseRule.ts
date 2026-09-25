import type { Rule } from '../../../shared/types';
import { RULE_ACTION_SPECS } from './constants';
import type { ResponseRule } from './types';

/** Whether a rule edits responses (runs at the Response stage). */
export function isResponseRule(rule: Rule): rule is ResponseRule {
  return Object.hasOwn(RULE_ACTION_SPECS, rule.action) && RULE_ACTION_SPECS[rule.action].stage === 'Response';
}
