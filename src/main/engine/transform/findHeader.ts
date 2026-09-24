import type { HeaderEntry } from './types';

/** `name` must be lower-case (see `headerValue` for any spelling). */
export function findHeader(headers: HeaderEntry[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name)?.value;
}
