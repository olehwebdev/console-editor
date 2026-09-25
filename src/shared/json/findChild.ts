import type { JsonNode } from './types';

/** The value under a key of an object (the last, of duplicates) or an index of an array. */
export function findChild(node: JsonNode, key: string | number): JsonNode | undefined {
  if (node.kind === 'object' && typeof key === 'string') return node.entries.findLast((e) => e.key === key)?.value;
  if (node.kind === 'array' && typeof key === 'number') return node.items[key];
  return undefined;
}
