import { applyResponseRules, findResponseRules, type PausedRequest, type ResponseHead } from '../rules';
import type { AnswerContext } from './types';

/** A response's head with the response rules that take its request applied; null when none changed it. */
export function ruledHead({ sources, matchers }: AnswerContext, request: PausedRequest, resourceType: string, head: ResponseHead): ResponseHead | null {
  const rules = findResponseRules(sources.getRules(), request.url, resourceType, matchers);
  const ruled = applyResponseRules(head, rules, request);
  return ruled.applied.length ? ruled.head : null;
}
