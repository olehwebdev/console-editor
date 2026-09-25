import { invalidRule } from './invalidRule';
import { sanitizeHeaderEdits } from './sanitizeHeaderEdits';
import type { RuleFieldSanitizers } from './types';

/** How each action's own fields are read from untrusted input. A new action fails typecheck until it has one. */
export const RULE_FIELD_SANITIZERS: RuleFieldSanitizers = {
  block: () => ({}),
  cors: () => ({}),
  headers: (input) => ({ headers: sanitizeHeaderEdits(input.headers) ?? invalidRule('headers') }),
};
