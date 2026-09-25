import { DEFAULT_REQUEST, DEFAULT_RESPONSE, RESPONSE_KIND, validateRequestMatch, validateResponseSettings } from '../../../shared/overrides';
import type { OverrideMeta, RequestMatch, ResourceKind, ResponseSettings } from '../../../shared/types';

/** The request match and response settings to keep for an override of `kind`. */
export type ResponseFields = Pick<OverrideMeta, 'request' | 'response'>;

/**
 * Checks, and copies, what a response override matches and answers, filling in what's missing from
 * the defaults (on create) or `current` (on update). Any other kind takes neither: asking for one
 * throws, so a caller can't store settings nothing would use.
 */
export function responseFieldsOf(kind: ResourceKind, request: RequestMatch | undefined, response: ResponseSettings | undefined, current: ResponseFields = {}): ResponseFields {
  if (kind !== RESPONSE_KIND) {
    if (request !== undefined || response !== undefined) throw new Error('Only a response override matches a method or sets a status');
    return {};
  }
  const nextRequest = request ?? current.request ?? DEFAULT_REQUEST;
  const nextResponse = response ?? current.response ?? DEFAULT_RESPONSE;
  const problem = validateRequestMatch(nextRequest) ?? validateResponseSettings(nextResponse);
  if (problem) throw new Error(problem);
  return {
    request: { method: nextRequest.method, operation: nextRequest.operation },
    response: {
      status: nextResponse.status,
      delayMs: nextResponse.delayMs,
      headers: nextResponse.headers.map(({ operation, name, value }) => ({ operation, name, value })),
      send: nextResponse.send,
      patch: nextResponse.patch,
    },
  };
}
