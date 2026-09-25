import type { JsonNode } from '@common/json';
import { TREE_CHILDREN } from './constants';

/** How many values an object or array holds (none for any other value). */
export function countChildren(node: JsonNode): number {
  return TREE_CHILDREN[node.kind](node as never).length;
}
