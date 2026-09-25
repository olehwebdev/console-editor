import type { BlockRule, Rule } from '../../../shared/types';
import type { MatcherCache } from '../InterceptionEngine/MatcherCache';
import { ruleMatches } from './ruleMatches';

/** The oldest block rule that applies to a request (`rules` come oldest first, so nothing is sorted per pause). */
export function findBlockRule(rules: readonly Rule[], url: string, resourceType: string, matchers: MatcherCache): BlockRule | undefined {
  return rules.find((rule): rule is BlockRule => rule.action === 'block' && ruleMatches(rule, url, resourceType, matchers));
}
