import type { JsonNode } from '@common/json';
import { NEW_KEY } from './constants';

/** A key an object doesn't have yet: `key`, else `key2`, `key3`… */
export function uniqueKey(parent: JsonNode): string {
  const taken = new Set(parent.kind === 'object' ? parent.entries.map((e) => e.key) : []);
  let n = 1;
  while (taken.has(n === 1 ? NEW_KEY : `${NEW_KEY}${n}`)) n++;
  return n === 1 ? NEW_KEY : `${NEW_KEY}${n}`;
}
