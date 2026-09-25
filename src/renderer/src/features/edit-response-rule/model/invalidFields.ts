import { DEFAULT_REQUEST, DEFAULT_RESPONSE, validateRequestMatch, validateResponseSettings } from '@common/overrides';
import type { ResponseRuleValue } from './types';

/** Which of a rule's typed fields hold something it can't be saved with, so each can show it as it is typed. */
export function invalidFields({ request, response }: ResponseRuleValue): { operation: boolean; status: boolean; delay: boolean } {
  return {
    operation: validateRequestMatch({ ...request, method: DEFAULT_REQUEST.method }) !== null,
    status: validateResponseSettings({ ...DEFAULT_RESPONSE, status: response.status }) !== null,
    delay: validateResponseSettings({ ...DEFAULT_RESPONSE, delayMs: response.delayMs }) !== null,
  };
}
