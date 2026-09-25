import { seedMatcher } from './seedMatcher';
import type { RuleSeeds } from './types';

/** Where a new rule of each action starts: every request type, and for headers one empty row to fill in. */
export const RULE_SEEDS: RuleSeeds = {
  block: (url) => ({ action: 'block', match: seedMatcher(url), resourceTypes: [] }),
  headers: (url) => ({ action: 'headers', match: seedMatcher(url), resourceTypes: [], headers: [{ operation: 'set', name: '', value: '' }] }),
  cors: (url) => ({ action: 'cors', match: seedMatcher(url), resourceTypes: [] }),
};
