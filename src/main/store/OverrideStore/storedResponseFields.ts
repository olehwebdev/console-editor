import { DEFAULT_REQUEST, DEFAULT_RESPONSE, RESPONSE_KIND, withResponseDefaults } from '../../../shared/overrides';
import type { OverrideMeta } from '../../../shared/types';
import { responseFieldsOf, type ResponseFields } from './responseFieldsOf';

/**
 * The request match and response settings of an override read from disk: checked as on create, so a
 * hand edit can't reach the engine. What doesn't pass falls back to the defaults (a response
 * override still answers, 200 with its body); other kinds keep neither.
 */
export function storedResponseFields(meta: OverrideMeta): ResponseFields {
  if (meta.kind !== RESPONSE_KIND) return {};
  const fallback = { request: { ...DEFAULT_REQUEST }, response: { ...DEFAULT_RESPONSE, headers: [] } };
  try {
    // Saved before `send` or `patch` existed: those were always sent, and answered with the saved text.
    return responseFieldsOf(meta.kind, meta.request, meta.response && withResponseDefaults(meta.response));
  } catch {
    try {
      return responseFieldsOf(meta.kind, meta.request, fallback.response);
    } catch {
      return fallback;
    }
  }
}
