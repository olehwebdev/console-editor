import { countChildren, treeChildId, type JsonTreeRow } from '@/shared/lib';
import { parentId } from './parentId';

/** The row to select once a row is removed: the one after it, else the one before, else its parent. */
export function idAfterRemoval(row: JsonTreeRow): string {
  const up = parentId(row.id) ?? '';
  const { parent, index = 0 } = row;
  if (!parent) return up;
  // An array's later items move up into its place, so the same id is the one after it.
  if (parent.kind === 'array') return countChildren(parent) > 1 ? treeChildId(up, Math.min(index, countChildren(parent) - 2)) : up;
  const entries = parent.kind === 'object' ? parent.entries : [];
  const neighbour = entries[index + 1] ?? entries[index - 1];
  return neighbour ? treeChildId(up, neighbour.key) : up;
}
