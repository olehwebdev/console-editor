import type { HeaderEntry } from './types';

/** CDP's `Network.Response.headers` object (name → value) as header entries. */
export function headerEntries(headers: Record<string, string> | undefined): HeaderEntry[] {
  return Object.entries(headers ?? {}).map(([name, value]) => ({ name, value }));
}
