import { RULE_RESOURCE_TYPES, type RuleResourceType } from '../types';

export function isRuleResourceType(value: unknown): value is RuleResourceType {
  return RULE_RESOURCE_TYPES.includes(value as RuleResourceType);
}
