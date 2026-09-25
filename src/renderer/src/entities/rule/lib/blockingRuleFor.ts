import { compareRuleAge } from '@common/rules';
import type { ResourceKind, Rule, RuleOf } from '@common/types';
import { predicateFor } from '@/shared/lib';

/**
 * The rule that blocks a file: the oldest enabled block rule whose types allow its kind and whose
 * matcher matches its URL. Takes the rules so a component can select it from the store. The page's
 * own document is never blocked: leaving it out is the caller's part.
 */
export function blockingRuleFor(rules: Record<string, Rule>, url: string, kind: ResourceKind): RuleOf<'block'> | undefined {
  let oldest: RuleOf<'block'> | undefined;
  for (const rule of Object.values(rules)) {
    if (rule.action !== 'block' || !rule.enabled) continue;
    if (rule.resourceTypes.length > 0 && !rule.resourceTypes.includes(kind)) continue;
    if (oldest && compareRuleAge(rule, oldest) > 0) continue;
    if (predicateFor(rule.match)(url)) oldest = rule;
  }
  return oldest;
}
