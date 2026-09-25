import { MAX_RULES } from '../../../shared/rules';
import type { CreateRuleInput } from '../../../shared/types';
import type { RuleState, StoredRule } from '../types';
import { newRuleId } from './newRuleId';

/** Adds an enabled rule to `workspaceId` in `state`; refused once the workspace holds MAX_RULES. */
export function addRule(state: RuleState, workspaceId: string, input: CreateRuleInput): StoredRule {
  if ([...state.rules.values()].filter((r) => r.workspaceId === workspaceId).length >= MAX_RULES) {
    throw new Error(`A workspace holds at most ${MAX_RULES} rules`);
  }
  const id = newRuleId(state);
  const now = Date.now();
  const rule: StoredRule = { workspaceId, id, ...input, enabled: true, createdAt: now, updatedAt: now };
  state.rules.set(id, rule);
  return rule;
}
