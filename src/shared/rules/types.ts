import type { CreateRuleInput, HeaderOperation, RuleAction } from '../types';

/** What creating a rule of one action takes. */
export type RuleInputOf<A extends RuleAction> = Extract<CreateRuleInput, { action: A }>;

/** Per action, the check of its own fields: a message or null. A new action fails typecheck until it has one. */
export type RuleInputChecks = { [A in RuleAction]: (input: RuleInputOf<A>) => string | null };

/** Per header operation, the check of the value it takes: a message or null. */
export type HeaderValueChecks = Record<HeaderOperation, (value: string) => string | null>;
