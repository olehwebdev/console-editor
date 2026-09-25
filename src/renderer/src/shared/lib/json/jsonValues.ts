import type { JsonNode } from '@common/json';
import { CHILD_SPANS } from './constants';

/** Visits every value in a tree, outermost first; a visit that returns false skips what that value holds. */
export function jsonValues(node: JsonNode, visit: (node: JsonNode) => boolean | void): void {
  if (visit(node) === false) return;
  for (const child of CHILD_SPANS[node.kind](node as never)) jsonValues(child.value, visit);
}
