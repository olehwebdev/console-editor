import type { TreeNavRow } from './types';

/**
 * `aria-posinset` / `aria-setsize` for every visible row: its 1-based place
 * among its siblings and their count. Virtualized trees must set them, since
 * the browser can only count the siblings that are rendered.
 */
export function treePositions(rows: readonly TreeNavRow[]): { posInSet: number; setSize: number }[] {
  const out = rows.map(() => ({ posInSet: 0, setSize: 0 }));
  // Open sibling groups by depth (indices into `rows`).
  const groups: number[][] = [];
  const close = (fromDepth: number) => {
    for (const group of groups.splice(fromDepth)) for (const i of group ?? []) out[i].setSize = group.length;
  };
  rows.forEach((row, i) => {
    close(row.depth + 1);
    const group = (groups[row.depth] ??= []);
    group.push(i);
    out[i].posInSet = group.length;
  });
  close(0);
  return out;
}
