import { compareRuleAge } from '@common/rules';
import type { ResourceKind, Rule, RuleOf, RuleResourceType } from '@common/types';
import { predicateFor } from '@/shared/lib';

/** The request type a rule's filter names each kind by: a response's request is fetch() or XHR. */
const RULE_TYPE: Record<ResourceKind, RuleResourceType> = { Document: 'Document', Script: 'Script', Stylesheet: 'Stylesheet', Fetch: 'XHR' };

/**
 * The rule that blocks a file or a response: the oldest enabled block rule whose types allow its kind and whose
 * matcher matches its URL. Takes the rules so a component can select it from the store. The page's
 * own document is never blocked: leaving it out is the caller's part.
 */
export function blockingRuleFor(rules: Record<string, Rule>, url: string, kind: ResourceKind): RuleOf<'block'> | undefined {
  let oldest: RuleOf<'block'> | undefined;
  for (const rule of Object.values(rules)) {
    if (rule.action !== 'block' || !rule.enabled) continue;
    if (rule.resourceTypes.length > 0 && !rule.resourceTypes.includes(RULE_TYPE[kind])) continue;
    if (oldest && compareRuleAge(rule, oldest) > 0) continue;
    if (predicateFor(rule.match)(url)) oldest = rule;
  }
  return oldest;
}
