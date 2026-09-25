import { z } from 'zod';
import type { CreateRuleInput } from '../types';
import { headerEditsSchema } from './headerEditsSchema';
import { resourceTypesSchema } from './resourceTypesSchema';
import { ruleMatcherSchema } from './ruleMatcherSchema';

/** The fields every rule has, whatever it does. */
const RULE_BASE = { match: ruleMatcherSchema, resourceTypes: resourceTypesSchema };

/**
 * A rule that can be saved: a usable matcher, known request types and its action's own fields, checked
 * in that order. Unknown keys are dropped. Typed as CreateRuleInput exactly: a new action fails
 * typecheck until it is here.
 */
export const ruleInputSchema = z.toZod<CreateRuleInput>()(
  z.discriminatedUnion(
    'action',
    [
      z.object({ action: z.literal('block'), ...RULE_BASE }),
      z.object({ action: z.literal('headers'), ...RULE_BASE, headers: headerEditsSchema }),
      z.object({ action: z.literal('cors'), ...RULE_BASE }),
    ],
    // An unknown action only: input that isn't an object keeps the reader's own message.
    { error: (issue) => (issue.code === 'invalid_union' ? 'Unknown rule action' : undefined) },
  ),
);
