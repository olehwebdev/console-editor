/** What keyboard navigation needs to know about a visible row of a flattened tree. */
export interface TreeNavRow {
  /** 0-based nesting level. */
  depth: number;
  /** `true` / `false` for folders, `undefined` for leaves. */
  expanded?: boolean;
}

/**
 * The row a WAI-ARIA tree key moves focus to, from the full list of visible
 * rows (a virtualized tree only renders some of them): ↑/↓, Home/End,
 * PageUp/PageDown, → to the first child of an expanded row, ← to the parent.
 * `null` when the key doesn't move focus (→/← on a folder that toggles instead).
 */
export function treeKeyTarget(rows: readonly TreeNavRow[], index: number, key: string, pageSize = 10): number | null {
  const row = rows[index];
  if (!row) return null;
  const last = rows.length - 1;
  switch (key) {
    case 'ArrowDown':
      return index < last ? index + 1 : null;
    case 'ArrowUp':
      return index > 0 ? index - 1 : null;
    case 'Home':
      return 0;
    case 'End':
      return last;
    case 'PageDown':
      return Math.min(last, index + pageSize);
    case 'PageUp':
      return Math.max(0, index - pageSize);
    case 'ArrowRight':
      return row.expanded === true && rows[index + 1] && rows[index + 1].depth > row.depth ? index + 1 : null;
    case 'ArrowLeft':
      if (row.expanded === true) return null;
      for (let i = index - 1; i >= 0; i--) if (rows[i].depth < row.depth) return i;
      return null;
    default:
      return null;
  }
}

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
