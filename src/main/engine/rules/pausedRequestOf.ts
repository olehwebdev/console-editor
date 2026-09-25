import type { RequestPausedParams } from '../InterceptionEngine/types';
import type { PausedRequest } from './types';

/** What rules and overrides read from a paused request: its request headers by lower-case name, its frame's URL and its body. */
export function pausedRequestOf(p: RequestPausedParams, frameUrl: string | undefined): PausedRequest {
  const headers = Object.fromEntries(Object.entries(p.request.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  const { postData } = p.request;
  return { url: p.request.url, method: p.request.method, headers, ...(frameUrl ? { frameUrl } : {}), ...(postData !== undefined ? { body: postData } : {}) };
}
