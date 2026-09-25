import type { RulePatch } from '../../shared/types';
import { invalidRule } from './invalidRule';
import { isRecord } from './isRecord';
import { sanitizeHeaderEdits } from './sanitizeHeaderEdits';
import { sanitizeMatcher } from './sanitizeMatcher';
import { sanitizeResourceTypes } from './sanitizeResourceTypes';

/**
 * A rule edit from untrusted input (IPC): only the fields present, as fresh
 * copies. Throws `Invalid rule: <field>` for a field of the wrong shape.
 */
export function sanitizeRulePatch(input: unknown): RulePatch {
  if (!isRecord(input)) return invalidRule('not an object');
  const patch: RulePatch = {};
  if (input.match !== undefined) patch.match = sanitizeMatcher(input.match) ?? invalidRule('match');
  if (input.resourceTypes !== undefined) patch.resourceTypes = sanitizeResourceTypes(input.resourceTypes) ?? invalidRule('resourceTypes');
  if (input.enabled !== undefined) patch.enabled = typeof input.enabled === 'boolean' ? input.enabled : invalidRule('enabled');
  if (input.headers !== undefined) patch.headers = sanitizeHeaderEdits(input.headers) ?? invalidRule('headers');
  return patch;
}
