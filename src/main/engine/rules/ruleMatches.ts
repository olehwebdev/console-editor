import type { Rule } from '../../../shared/types';
import { DOCUMENT_KIND } from '../InterceptionEngine/constants';
import type { MatcherCache } from '../InterceptionEngine/MatcherCache';
import { RULE_ACTION_SPECS } from './constants';
import { ruleTypeOf } from './ruleTypeOf';

/**
 * Whether a rule applies to a paused request, cheap checks first: it is on, this
 * build knows its action, the action applies to this type (CORS never to
 * documents), the type filter lets it through (empty = every type), and the URL
 * matches. The type filter lives only here: rule patterns carry no resource type.
 */
export function ruleMatches(rule: Rule, url: string, resourceType: string, matchers: MatcherCache): boolean {
  if (!rule.enabled || !Object.hasOwn(RULE_ACTION_SPECS, rule.action)) return false;
  if (!RULE_ACTION_SPECS[rule.action].documents && resourceType === DOCUMENT_KIND) return false;
  if (rule.resourceTypes.length > 0 && !rule.resourceTypes.includes(ruleTypeOf(resourceType))) return false;
  return matchers.predicate(rule.match)(url);
}
