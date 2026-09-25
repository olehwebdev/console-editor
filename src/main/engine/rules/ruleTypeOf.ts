import type { RuleResourceType } from '../../../shared/types';
import { isRuleResourceType } from '../../../shared/rules';
import { OTHER_RULE_TYPE, RESOURCE_TYPE_ALIASES } from './constants';

/** The type filter's name for a paused request's CDP resource type. */
export function ruleTypeOf(cdpType: string): RuleResourceType {
  const aliased = Object.hasOwn(RESOURCE_TYPE_ALIASES, cdpType) ? RESOURCE_TYPE_ALIASES[cdpType] : cdpType;
  return isRuleResourceType(aliased) ? aliased : OTHER_RULE_TYPE;
}
