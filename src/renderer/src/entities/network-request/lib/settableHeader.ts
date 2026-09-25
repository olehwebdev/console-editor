import type { HttpHeader } from '@common/types';
import { UNSETTABLE_HEADER_PREFIXES, UNSETTABLE_HEADERS } from './constants';

/** Whether fetch() may set a header: the browser sets the rest itself (cookies, origin, host…), and HTTP/2's pseudo-headers aren't headers. */
export function settableHeader({ name }: HttpHeader): boolean {
  const lower = name.toLowerCase();
  return !lower.startsWith(':') && !UNSETTABLE_HEADERS.has(lower) && !UNSETTABLE_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
