import type { Parsed } from '../types';

/** A map that can't be read, and why (shown to the user). */
export function invalidMap(detail: string): Parsed<never> {
  return { ok: false, failure: 'invalid', detail };
}
