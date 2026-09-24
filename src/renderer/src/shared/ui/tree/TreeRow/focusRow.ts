// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { treeRows } from './treeRows';

/** Focuses the row `pick` chooses among `from`'s tree rows, given `from`'s index; nothing if it picks none. */
export function focusRow(from: HTMLElement, pick: (rows: HTMLElement[], index: number) => HTMLElement | undefined) {
  const rows = treeRows(from);
  const target = pick(rows, rows.indexOf(from));
  target?.focus();
}
