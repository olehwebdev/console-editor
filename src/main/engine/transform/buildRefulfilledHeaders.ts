import { ENCODING_HEADERS } from './constants';
import type { HeaderEntry } from './types';

/** Headers for passing an upstream body back unchanged through `Fetch.fulfillRequest` (it is handed over decoded). */
export function buildRefulfilledHeaders(upstream: HeaderEntry[] | undefined): HeaderEntry[] {
  return (upstream ?? []).filter((h) => !ENCODING_HEADERS.has(h.name.toLowerCase()));
}
