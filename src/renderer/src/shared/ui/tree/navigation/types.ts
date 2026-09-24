/** What keyboard navigation needs to know about a visible row of a flattened tree. */
export interface TreeNavRow {
  /** 0-based nesting level. */
  depth: number;
  /** `true` / `false` for folders, `undefined` for leaves. */
  expanded?: boolean;
}

/** Where a tree key is pressed: on `rows[index]` (`row`), `last` being the last row's index. */
export interface TreeKeyTargetContext {
  rows: readonly TreeNavRow[];
  index: number;
  row: TreeNavRow;
  last: number;
  pageSize: number;
}

/** The row index a key moves focus to, or `null` when it doesn't move focus. */
export type TreeKeyTargetHandler = (at: TreeKeyTargetContext) => number | null;
