import type { RuleAction } from '../../shared/types';
import { RULE_FIELD_SANITIZERS } from './ruleFieldSanitizers';
import type { RuleFieldsOf } from './types';

/** Reads an action's own fields from untrusted input. Generic so each action reaches its own reader without a cast. */
export function sanitizeRuleFields<A extends RuleAction>(action: A, input: Record<string, unknown>): RuleFieldsOf<A> {
  return RULE_FIELD_SANITIZERS[action](input);
}
