import type { Rule } from '../../../shared/types';
import type { MatcherCache } from '../InterceptionEngine/MatcherCache';
import { isResponseRule } from './isResponseRule';
import { ruleMatches } from './ruleMatches';
import type { ResponseRule } from './types';

/** Every rule that edits this request's response, in the order they apply (oldest first). */
export function findResponseRules(rules: readonly Rule[], url: string, resourceType: string, matchers: MatcherCache): ResponseRule[] {
  return rules.filter((rule): rule is ResponseRule => isResponseRule(rule) && ruleMatches(rule, url, resourceType, matchers));
}
