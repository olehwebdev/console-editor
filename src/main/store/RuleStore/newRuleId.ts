import { randomBytes } from 'node:crypto';
import { RULE_ID_BYTES } from '../constants';
import { isRecord } from '../isRecord';
import type { RuleState } from '../types';

/** A random id that no rule, and no entry kept verbatim, has yet. */
export function newRuleId(state: RuleState): string {
  const taken = new Set(state.foreign.map((entry) => (isRecord(entry) ? entry.id : undefined)));
  let id: string;
  do id = randomBytes(RULE_ID_BYTES).toString('hex');
  while (state.rules.has(id) || taken.has(id));
  return id;
}
