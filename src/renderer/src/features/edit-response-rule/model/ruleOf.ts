import { DEFAULT_REQUEST, DEFAULT_RESPONSE } from '@common/overrides';
import type { RequestMatch, ResponseSettings } from '@common/types';
import type { ResponseRuleValue } from './types';

/** A response override's (or unsaved response tab's) rule, with the defaults for what it doesn't say. */
export function ruleOf(source: { request?: RequestMatch; response?: ResponseSettings }): ResponseRuleValue {
  return { request: source.request ?? DEFAULT_REQUEST, response: source.response ?? DEFAULT_RESPONSE };
}
