import type { z } from 'zod';
import type { CreateRuleInput, HeaderOperation, RuleAction } from '../types';

/** What creating a rule of one action takes. */
export type RuleInputOf<A extends RuleAction> = Extract<CreateRuleInput, { action: A }>;

/** Per header operation, the value it takes. A new operation fails typecheck until it has one. */
export type HeaderValueSchemas = Record<HeaderOperation, z.ZodType<string>>;
