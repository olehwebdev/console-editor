import type { CreateRuleInput } from '../types';
import { checkRuleFields } from './checkRuleFields';
import { isRuleAction } from './isRuleAction';
import { isRuleResourceType } from './isRuleResourceType';
import { validateRuleMatcher } from './validateRuleMatcher';

/** What's wrong with a rule, as the message to show, or null when it can be saved. */
export function validateRuleInput(input: CreateRuleInput): string | null {
  if (!isRuleAction(input.action)) return 'Unknown rule action';
  const matcherError = validateRuleMatcher(input.match);
  if (matcherError) return matcherError;
  if (!input.resourceTypes.every(isRuleResourceType)) return 'Unknown request type';
  return checkRuleFields(input);
}
