// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** A key pressed on a focused row. */
export interface TreeRowKeyContext {
  row: HTMLElement;
  /** The row's `expanded` prop: `undefined` for a leaf. */
  expanded: boolean | undefined;
  onToggle: (() => void) | undefined;
  /** The key is held down (auto-repeat). */
  repeat: boolean;
}

/** Returns `false` when the key does nothing on this row, so its default action runs. */
export type TreeRowKeyHandler = (key: TreeRowKeyContext) => false | void;
