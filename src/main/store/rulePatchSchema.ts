import { z } from 'zod';
import { headerEditsSchema, resourceTypesSchema, ruleMatcherSchema } from '../../shared/rules';
import type { RulePatch } from '../../shared/types';

/** A rule edit: only the fields given, each checked as a rule's. A field given as undefined is refused, not dropped. */
export const rulePatchSchema = z.object({
  match: ruleMatcherSchema.exactOptional(),
  resourceTypes: resourceTypesSchema.exactOptional(),
  enabled: z.boolean().exactOptional(),
  headers: headerEditsSchema.exactOptional(),
}) satisfies z.ZodType<RulePatch>;
