import type { RuleInputOf } from '@common/rules';
import type { RuleAction } from '@common/types';

/** Per action, a new rule's starting point: for a URL (a file row), or from scratch. */
export type RuleSeeds = { [A in RuleAction]: (url?: string) => RuleInputOf<A> };
