// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { PaletteKeyActions, PaletteNavigation } from './types';

const PAGE_STEP = 8;

/** Binds what the palette's keys do to the panel's current results. */
export function createPaletteKeyActions({ count, current, moveTo, run, close }: PaletteNavigation): PaletteKeyActions {
  return {
    step: (direction) => {
      if (count === 0) return;
      moveTo((current + direction + count) % count, direction);
    },
    page: (direction) => {
      if (count === 0) return;
      moveTo(Math.min(Math.max(current + direction * PAGE_STEP, 0), count - 1), direction);
    },
    runActive: () => {
      if (current >= 0) run(current);
    },
    close,
  };
}
