import type { JsonNode } from '@common/json';
import { TREE_CHILDREN } from './constants';
import { treeChildId } from './treeChildId';
import type { JsonTreeRow } from './types';

/** The rows a JSON tree shows, top to bottom: every value, and the children of the objects and arrays whose ids are open. */
export function flattenJson(node: JsonNode, open: ReadonlySet<string>, rows: JsonTreeRow[] = [], place: Omit<JsonTreeRow, 'node' | 'open'> = { id: '', depth: 0 }): JsonTreeRow[] {
  const children = TREE_CHILDREN[node.kind](node as never);
  const isOpen = (node.kind === 'object' || node.kind === 'array') && open.has(place.id);
  rows.push({ ...place, node, open: isOpen });
  if (!isOpen) return rows;
  const seen = new Set<string | number>();
  children.forEach((child, index) => {
    const id = treeChildId(place.id, child.key, seen.has(child.key) ? index : undefined);
    seen.add(child.key);
    flattenJson(child.value, open, rows, { id, depth: place.depth + 1, key: child.key, ...(child.entry ? { entry: child.entry } : {}), parent: node, index });
  });
  return rows;
}
