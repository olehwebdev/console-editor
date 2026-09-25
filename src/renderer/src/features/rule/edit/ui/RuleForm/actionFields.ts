import { BlockFields } from './BlockFields';
import { CorsFields } from './CorsFields';
import { HeaderEditsField } from './HeaderEditsField';
import type { RuleActionFields } from './types';

/** Each action's own fields. Annotated rather than `satisfies`: `ActionFields`' generic lookup needs the mapped type. */
export const RULE_ACTION_FIELDS: RuleActionFields = {
  block: BlockFields,
  headers: HeaderEditsField,
  cors: CorsFields,
};
