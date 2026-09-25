import { applyCors } from './applyCors';
import { applyHeaderEdits } from './applyHeaderEdits';
import type { ResponseRuleAppliers } from './types';

/** What each Response-stage action does to a response head. */
export const RESPONSE_RULE_APPLIERS: ResponseRuleAppliers = {
  headers: (head, rule) => ({ ...head, headers: applyHeaderEdits(head.headers, rule.headers) }),
  cors: (head, _rule, request) => applyCors(head, request),
};
