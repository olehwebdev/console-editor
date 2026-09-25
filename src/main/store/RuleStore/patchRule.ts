import { validateRuleInput } from '../../../shared/rules';
import type { RulePatch } from '../../../shared/types';
import type { RuleState, StoredRule } from '../types';

/** Applies a (sanitized) patch to a rule in `state`: header edits only on a header rule, and the result must be valid. */
export function patchRule(state: RuleState, id: string, patch: RulePatch): StoredRule {
  const current = state.rules.get(id);
  if (!current) throw new Error(`Unknown rule ${id}`);
  if (patch.headers !== undefined && current.action !== 'headers') throw new Error('Only header rules have headers');
  // The patch holds only fields `current`'s action has (checked above), so the merge stays that member.
  const next = { ...current, ...patch, updatedAt: Date.now() } as StoredRule;
  const error = validateRuleInput(next);
  if (error) throw new Error(error);
  state.rules.set(id, next);
  return next;
}
