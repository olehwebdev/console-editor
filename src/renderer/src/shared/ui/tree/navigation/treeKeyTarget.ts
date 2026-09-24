import { TREE_KEY_TARGETS } from './treeKeyTargets';
import type { TreeNavRow } from './types';

/** Rows PageUp / PageDown move by, unless the caller knows how many fit. */
const PAGE_SIZE = 10;

/**
 * The row a WAI-ARIA tree key moves focus to, from the full list of visible
 * rows (a virtualized tree only renders some of them): ↑/↓, Home/End,
 * PageUp/PageDown, → to the first child of an expanded row, ← to the parent.
 * `null` when the key doesn't move focus (→/← on a folder that toggles instead).
 */
export function treeKeyTarget(rows: readonly TreeNavRow[], index: number, key: string, pageSize = PAGE_SIZE): number | null {
  const row = rows[index];
  if (!row || !Object.hasOwn(TREE_KEY_TARGETS, key)) return null;
  return TREE_KEY_TARGETS[key]({ rows, index, row, last: rows.length - 1, pageSize });
}
