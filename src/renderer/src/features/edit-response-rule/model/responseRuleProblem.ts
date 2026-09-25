import { validateRequestMatch, validateResponseSettings } from '@common/overrides';
import type { ResponseRuleValue } from './types';

/** What is wrong with a rule, or null: the checks the main process makes before storing it. */
export function responseRuleProblem({ request, response }: ResponseRuleValue): string | null {
  return validateRequestMatch(request) ?? validateResponseSettings(response);
}
