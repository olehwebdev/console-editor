import { CONTENT_TYPE, EVENT_STREAM_MIME_TYPE } from '../constants';
import { headerValue } from '../transform';
import type { RequestPausedParams } from './types';

/**
 * Whether a paused response is an event stream. Its body is never read: `Fetch.getResponseBody` doesn't
 * return while the stream is open, and the page then gets nothing even once it is let go (probed in
 * Chromium 141 and 152).
 */
export function isEventStream(p: RequestPausedParams): boolean {
  return (headerValue(p.responseHeaders, CONTENT_TYPE) ?? '').toLowerCase().includes(EVENT_STREAM_MIME_TYPE);
}
