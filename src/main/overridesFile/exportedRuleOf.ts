import type { Rule } from '../../shared/types';
import type { ExportedRule } from './types';

/** A rule as an export lists it: without its id and times, which the importing store sets. */
export function exportedRuleOf({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rule }: Rule): ExportedRule {
  return rule as ExportedRule;
}
