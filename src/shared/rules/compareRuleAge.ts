import type { Rule } from '../types';

/** Oldest first (ties by id, so the order is stable): the order rules apply in, a newer one's change winning. */
export function compareRuleAge(a: Pick<Rule, 'createdAt' | 'id'>, b: Pick<Rule, 'createdAt' | 'id'>): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}
