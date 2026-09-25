import type { PausedResponse, RequestPausedParams } from './types';

/**
 * Whether a Response-stage pause carries a whole response head that can be
 * passed on: not a network error (nor Electron's extra `'Failed'` re-pause of
 * a preflight), and with a status and a header list, which must never be
 * replaced by a rule's edits alone.
 */
export function hasResponseHead(p: RequestPausedParams): p is PausedResponse {
  return !p.responseErrorReason && p.responseStatusCode !== undefined && p.responseHeaders !== undefined;
}
