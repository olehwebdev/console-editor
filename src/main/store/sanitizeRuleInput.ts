import { isRuleAction } from '../../shared/rules';
import type { CreateRuleInput } from '../../shared/types';
import { invalidRule } from './invalidRule';
import { isRecord } from './isRecord';
import { sanitizeMatcher } from './sanitizeMatcher';
import { sanitizeResourceTypes } from './sanitizeResourceTypes';
import { sanitizeRuleFields } from './sanitizeRuleFields';

/**
 * A rule to create, from untrusted input (IPC, or an entry of rules.json): the
 * known fields of its action only, as fresh copies. Throws `Invalid rule: <field>`
 * for a field of the wrong shape. What the values mean is validateRuleInput's to check.
 */
export function sanitizeRuleInput(input: unknown): CreateRuleInput {
  if (!isRecord(input)) return invalidRule('not an object');
  const { action } = input;
  if (!isRuleAction(action)) return invalidRule('action');
  const match = sanitizeMatcher(input.match) ?? invalidRule('match');
  const resourceTypes = sanitizeResourceTypes(input.resourceTypes) ?? invalidRule('resourceTypes');
  // The action's own fields come from the action's own reader, so the spread holds exactly that member's fields.
  return { action, match, resourceTypes, ...sanitizeRuleFields(action, input) } as CreateRuleInput;
}
