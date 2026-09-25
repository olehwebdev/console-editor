import { MAX_HEADER_EDITS } from './constants';
import type { RuleInputChecks } from './types';
import { validateHeaderEdit } from './validateHeaderEdit';

/** The check of each action's own fields. */
export const RULE_INPUT_CHECKS: RuleInputChecks = {
  block: () => null,
  cors: () => null,
  headers: (input) => {
    if (input.headers.length === 0) return 'Add at least one header change';
    if (input.headers.length > MAX_HEADER_EDITS) return `A rule makes at most ${MAX_HEADER_EDITS} header changes`;
    for (const edit of input.headers) {
      const error = validateHeaderEdit(edit);
      if (error) return error;
    }
    return null;
  },
};
