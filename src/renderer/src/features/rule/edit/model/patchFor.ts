import { sameMatcher } from '@common/matcher';
import { sameRuleInput } from '@common/rules';
import type { CreateRuleInput, RulePatch } from '@common/types';

/** What to send to turn `saved` into `value`: only the fields that changed (the action can't). */
export function patchFor(saved: CreateRuleInput, value: CreateRuleInput): RulePatch {
  const patch: RulePatch = {};
  if (!sameMatcher(saved.match, value.match)) patch.match = value.match;
  // The lists are compared by sameRuleInput, with every other field taken from `saved`.
  if (!sameRuleInput(saved, { ...saved, resourceTypes: value.resourceTypes })) patch.resourceTypes = value.resourceTypes;
  if ('headers' in saved && 'headers' in value && !sameRuleInput(saved, { ...saved, headers: value.headers })) patch.headers = value.headers;
  return patch;
}
