// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { TreeRowKeyContext } from './types';

/** Enter / Space: a click, once per press (not on key repeat). */
export function clickRow({ row, repeat }: TreeRowKeyContext): void {
  if (!repeat) row.click();
}
