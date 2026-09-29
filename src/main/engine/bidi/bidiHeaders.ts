import type { HeaderEntry } from '../transform';
import type { BidiHeader } from './types';

/** Headers as BiDi takes them. */
export function bidiHeaders(headers: readonly HeaderEntry[]): BidiHeader[] {
  return headers.map(({ name, value }) => ({ name, value: { type: 'string', value } }));
}
