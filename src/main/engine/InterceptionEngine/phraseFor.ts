import type { RequestPausedParams } from './types';

/**
 * The `responsePhrase` to send on with a response code: upstream's status text
 * while the code is upstream's, else none (Chromium then uses the code's own).
 */
export function phraseFor(p: RequestPausedParams, status: number): { responsePhrase?: string } {
  return status === p.responseStatusCode && p.responseStatusText ? { responsePhrase: p.responseStatusText } : {};
}
