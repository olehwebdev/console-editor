import { compareRuleAge } from '@common/rules';
import type { RuleStore } from './types';

/** The rules oldest first, the order they apply in. A new array each time: select it with `useShallow`. */
export const selectRuleList = (s: RuleStore) => Object.values(s.byId).sort(compareRuleAge);
