// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ComponentPropsWithRef } from 'react';

export interface HoverHighlightProps extends ComponentPropsWithRef<'div'> {
  /** Classes for the moving pill (default: `rounded-md bg-hover`). */
  pillClassName?: string;
  /** Extra horizontal reach of the pill on each side of the row, in px (negative shrinks it). */
  inset?: number;
  /** Stop tracking and hide the pill. */
  disabled?: boolean;
  /**
   * Make the container the keyboard entry point of its rows: Tab lands on the
   * container, which forwards focus to the row with `tabindex="0"`, the
   * selected row, or the first row. On by default for `role="tree" | "listbox" | "grid"`.
   */
  focusEntry?: boolean;
}

export type Box = { left: number; top: number; width: number; height: number };
