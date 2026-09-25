import type { HttpHeader } from '../../shared/types';

/** CDP's `Network.Headers` (an object; values may be joined with newlines) as a list, in the order given. */
export function toHeaders(headers: Record<string, string> | undefined): HttpHeader[] {
  return Object.entries(headers ?? {}).map(([name, value]) => ({ name, value: String(value) }));
}
