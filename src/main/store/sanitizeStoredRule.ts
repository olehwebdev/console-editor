import { validateRuleInput } from '../../shared/rules';
import type { CreateRuleInput } from '../../shared/types';
import { RULE_ID } from './constants';
import { isRecord } from './isRecord';
import { sanitizeRuleInput } from './sanitizeRuleInput';
import type { StoredRule } from './types';

/**
 * A rules.json entry this build can use, built from its known fields only; null
 * for anything else (a newer build's action or type, a hand edit), which the
 * store then keeps verbatim. A `workspaceId` of '' is fine: adopted at start.
 */
export function sanitizeStoredRule(input: unknown): StoredRule | null {
  if (!isRecord(input) || typeof input.id !== 'string' || !RULE_ID.test(input.id) || typeof input.workspaceId !== 'string') return null;
  const { id, workspaceId, enabled, createdAt, updatedAt } = input;
  if (typeof enabled !== 'boolean' || typeof createdAt !== 'number' || typeof updatedAt !== 'number') return null;
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null;
  let rule: CreateRuleInput;
  try {
    rule = sanitizeRuleInput(input);
  } catch {
    return null;
  }
  if (validateRuleInput(rule)) return null;
  return { workspaceId, id, ...rule, enabled, createdAt, updatedAt };
}
