// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { MenuInitialFocus } from './types';

/** The row a menu opens on, from its enabled rows, by how it was opened; -1 for none. */
export const INITIAL_ACTIVE: Record<MenuInitialFocus, (enabled: readonly number[]) => number> = {
  first: (enabled) => enabled[0] ?? -1,
  last: (enabled) => enabled[enabled.length - 1] ?? -1,
  none: () => -1,
};
