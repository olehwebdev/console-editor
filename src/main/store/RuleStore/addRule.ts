import { MAX_RULES } from '../../../shared/rules';
import type { CreateRuleInput } from '../../../shared/types';
import type { RuleState, StoredRule } from '../types';
import { newRuleId } from './newRuleId';

/**
 * Adds an enabled rule to `workspaceId` in `state`, never in the same millisecond as another of its
 * rules; refused once the workspace holds MAX_RULES.
 */
export function addRule(state: RuleState, workspaceId: string, input: CreateRuleInput): StoredRule {
  const own = [...state.rules.values()].filter((r) => r.workspaceId === workspaceId);
  if (own.length >= MAX_RULES) throw new Error(`A workspace holds at most ${MAX_RULES} rules`);
  const id = newRuleId(state);
  // Two rules made in one millisecond (an import) would tie, and a tie goes by id, at random: the later one goes
  // past the newest instead, so rules, which apply oldest first, keep the order they were made in.
  const clock = Date.now();
  const now = own.some((r) => r.createdAt === clock) ? Math.max(...own.map((r) => r.createdAt)) + 1 : clock;
  const rule: StoredRule = { workspaceId, id, ...input, enabled: true, createdAt: now, updatedAt: now };
  state.rules.set(id, rule);
  return rule;
}
