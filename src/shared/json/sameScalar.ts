import type { JsonNode } from './types';

/** Whether two values that hold no others are the same: numbers by their text, as they are served. */
export function sameScalar(a: JsonNode, b: JsonNode): boolean {
  if (a.kind === 'number' && b.kind === 'number') return a.raw === b.raw;
  if (a.kind === 'string' && b.kind === 'string') return a.value === b.value;
  if (a.kind === 'boolean' && b.kind === 'boolean') return a.value === b.value;
  return a.kind === 'null' && b.kind === 'null';
}
