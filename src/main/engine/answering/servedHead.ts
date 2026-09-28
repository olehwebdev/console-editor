import type { Override } from '../../../shared/types';
import { OVERRIDE_STATUS } from '../InterceptionEngine/constants';
import { applyCors, applyHeaderEdits, applyResponseRules, findResponseRules, type PausedRequest, type ResponseHead } from '../rules';
import { buildOverrideHeaders } from '../transform';
import { ORIGIN_HEADER } from './constants';
import type { AnswerContext } from './types';

/**
 * The head an override answers with before its request is sent (where a browser can't replace a body once upstream
 * has answered): its kind's own headers, with no upstream's to start from; a response override's status and header
 * changes; readable cross-origin when the request came from another origin; then the response rules.
 */
export function servedHead(override: Override, request: PausedRequest, resourceType: string, { sources, matchers }: AnswerContext): ResponseHead {
  const headers = buildOverrideHeaders(undefined, override.kind, sources.getSettings());
  const own: ResponseHead = override.response ? { status: override.response.status, headers: applyHeaderEdits(headers, override.response.headers) } : { status: OVERRIDE_STATUS, headers };
  const readable = request.headers[ORIGIN_HEADER] ? applyCors(own, request) : own;
  return applyResponseRules(readable, findResponseRules(sources.getRules(), request.url, resourceType, matchers), request).head;
}
