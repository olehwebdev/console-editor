import { BlockFields } from './BlockFields';
import { CorsFields } from './CorsFields';
import { HeaderEditsField } from './HeaderEditsField';
import type { RuleActionFields } from './types';

/** Each action's own fields. */
export const RULE_ACTION_FIELDS: RuleActionFields = {
  block: BlockFields,
  headers: HeaderEditsField,
  cors: CorsFields,
};
