// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { MouseEvent } from 'react';

/** Enter/Space activation produces a click with no pointer detail. */
export function clickedByKeyboard(event: MouseEvent): boolean {
  return event.detail === 0;
}
