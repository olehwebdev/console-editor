import { RULE_PAGE_PREFIX } from './constants';

/** The id of a saved rule's page. */
export function rulePageId(ruleId: string): string {
  return `${RULE_PAGE_PREFIX}${ruleId}`;
}
