import { RESPONSE_KIND, validateRequestMatch, validateResponseSettings, withResponseDefaults } from '../../shared/overrides';
import type { SessionTab } from '../../shared/types';

/** A response tab's pending request match and response settings, when well formed (checked as an override's). */
export function pendingResponse(t: Partial<SessionTab>): Pick<SessionTab, 'request' | 'response'> {
  if (t.kind !== RESPONSE_KIND || !t.request || !t.response) return {};
  // A session saved before `send` or `patch` existed.
  const response = withResponseDefaults(t.response);
  if (validateRequestMatch(t.request) || validateResponseSettings(response)) return {};
  const { request } = t;
  return {
    request: { method: request.method, operation: request.operation },
    response: {
      status: response.status,
      delayMs: response.delayMs,
      headers: response.headers.map(({ operation, name, value }) => ({ operation, name, value })),
      send: response.send,
      patch: response.patch,
    },
  };
}
