import type { PausedRequest } from '../rules';
import type { BidiRequestData } from './types';

/** What rules and overrides read from a BiDi request: its address, method and headers by lower-case name (no body). */
export function requestOf({ url, method, headers }: BidiRequestData): PausedRequest {
  return { url, method, headers: Object.fromEntries(headers.map(({ name, value }) => [name.toLowerCase(), value.value])) };
}
