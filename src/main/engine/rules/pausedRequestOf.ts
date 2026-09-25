import type { RequestPausedParams } from '../InterceptionEngine/types';
import type { PausedRequest } from './types';

/** What rules read from a paused request: its request headers by lower-case name, and its frame's URL. */
export function pausedRequestOf(p: RequestPausedParams, frameUrl: string | undefined): PausedRequest {
  const headers = Object.fromEntries(Object.entries(p.request.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  return { url: p.request.url, method: p.request.method, headers, ...(frameUrl ? { frameUrl } : {}) };
}
