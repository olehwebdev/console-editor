import type { ResponseSettings } from '../types';

/** Response settings as stored by an earlier version: before `send` the request was always sent, before `patch` the saved text answered. */
export function withResponseDefaults(response: ResponseSettings): ResponseSettings {
  if (!response || typeof response !== 'object') return response;
  return { ...response, send: response.send ?? true, patch: response.patch ?? false };
}
