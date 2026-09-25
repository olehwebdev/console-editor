import type { HeaderEntry } from '../transform';
import { COOKIE_HEADERS, CORS_RESPONSE_HEADERS, CORS_SAFELISTED_RESPONSE_HEADERS, HEADER_LIST_SEPARATOR } from './constants';

/**
 * Access-Control-Expose-Headers for a response: every header name it has that
 * a page can't already read, lower-cased and once each. Undefined when that
 * leaves none. (`*` would be taken literally for a credentialed request.)
 */
export function exposeHeaders(headers: readonly HeaderEntry[]): string | undefined {
  const names = new Set<string>();
  for (const { name } of headers) {
    const lower = name.toLowerCase();
    if (!CORS_SAFELISTED_RESPONSE_HEADERS.has(lower) && !COOKIE_HEADERS.has(lower) && !CORS_RESPONSE_HEADERS.has(lower)) names.add(lower);
  }
  return names.size > 0 ? [...names].join(HEADER_LIST_SEPARATOR) : undefined;
}
