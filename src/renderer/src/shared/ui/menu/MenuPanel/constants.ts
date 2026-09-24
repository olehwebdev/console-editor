// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { MenuCloseReason } from './types';

/** Close reasons after which the owner should hand focus back to where it was. */
export const RESTORES_FOCUS: ReadonlySet<MenuCloseReason> = new Set(['select', 'escape', 'tab', 'dismiss']);

/** Space between a dropdown and its trigger, in px. */
export const TRIGGER_GAP = 4;
