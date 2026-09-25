import { isRuleResourceType } from '../../shared/rules';
import { RULE_RESOURCE_TYPES, type RuleResourceType } from '../../shared/types';

/**
 * Known request types, once each, in RULE_RESOURCE_TYPES order; null if any is
 * unknown: dropping it would widen the rule, as an empty list means every type.
 */
export function sanitizeResourceTypes(input: unknown): RuleResourceType[] | null {
  if (!Array.isArray(input) || !input.every(isRuleResourceType)) return null;
  return RULE_RESOURCE_TYPES.filter((type) => input.includes(type));
}
