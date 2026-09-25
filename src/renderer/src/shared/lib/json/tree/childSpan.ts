import type { JsonNode } from '@common/json';
import { TREE_CHILDREN } from './constants';

/** Where a child of an object or array is written: an object member from its key to the end of its value. */
export function childSpan(parent: JsonNode, index: number): { from: number; to: number } | undefined {
  const child = TREE_CHILDREN[parent.kind](parent as never)[index];
  return child && { from: child.entry?.keyStart ?? child.value.start, to: child.value.end };
}
