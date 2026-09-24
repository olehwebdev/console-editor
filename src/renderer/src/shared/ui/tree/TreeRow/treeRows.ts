// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
const TREE = '[role="tree"]';
const TREE_ITEM = '[role="treeitem"]';

/** The rendered rows of `row`'s own tree (not of trees nested in it), in document order. */
export function treeRows(row: HTMLElement): HTMLElement[] {
  const tree = row.closest<HTMLElement>(TREE) ?? row.parentElement;
  if (!tree) return [row];
  return Array.from(tree.querySelectorAll<HTMLElement>(TREE_ITEM)).filter((el) => el.closest(TREE) === row.closest(TREE));
}
