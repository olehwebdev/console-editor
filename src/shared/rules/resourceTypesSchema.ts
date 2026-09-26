import { z } from 'zod';
import { RULE_RESOURCE_TYPES } from '../types';

/**
 * The request types a rule is limited to, as kept: once each, in RULE_RESOURCE_TYPES order. An
 * unknown one is refused, not dropped: dropping it would widen the rule, as none means every type.
 */
export const resourceTypesSchema = z
  .array(z.enum(RULE_RESOURCE_TYPES, { error: 'Unknown request type' }))
  .transform((types) => RULE_RESOURCE_TYPES.filter((type) => types.includes(type)));
