import { readFile } from 'node:fs/promises';
import { FILE_NOT_FOUND } from '../../constants';
import { sanitizeStoredRule } from '../sanitizeStoredRule';
import type { StoredRule } from '../types';
import { parseRuleIndex } from './parseRuleIndex';
import { setAsideIndex } from './setAsideIndex';
import type { ReadRules } from './types';

/**
 * Reads rules.json. Entries this build can't read (a newer build's action or
 * request type, a hand edit, a duplicate id) are kept aside, verbatim. A file
 * that isn't JSON of that shape is moved aside; one that can't be read is left
 * as it is and locks the store. Either way no rules are read from it.
 */
export async function readRuleIndex(indexPath: string): Promise<ReadRules> {
  const rules = new Map<string, StoredRule>();
  const foreign: unknown[] = [];
  let text: string;
  try {
    text = await readFile(indexPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return { rules, foreign };
    const locked = `${indexPath} could not be read (${(err as Error).message}); rules can't be changed until it can`;
    console.warn(locked);
    return { rules, foreign, locked };
  }
  const entries = parseRuleIndex(text);
  if (!entries) return { rules, foreign, ...(await setAsideIndex(indexPath)) };
  for (const entry of entries) {
    const rule = sanitizeStoredRule(entry);
    // A duplicate id is kept like any entry this build can't use.
    if (rule && !rules.has(rule.id)) rules.set(rule.id, rule);
    else foreign.push(entry);
  }
  return { rules, foreign };
}
