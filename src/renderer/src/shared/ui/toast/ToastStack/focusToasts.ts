// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { focusHost } from './focusHost';

/**
 * Moves keyboard focus to the front toast (its action, else its close button),
 * which fans the stack out and pauses the timers. Tab walks the cards, Esc
 * dismisses one, and focus returns to where it was once the last one goes.
 * Returns false when there is no toast. Bind it to a hotkey (e.g. F6 or Alt+N):
 * the stack is portalled to the end of <body>, so Tab alone reaches it last.
 */
export function focusToasts(): boolean {
  return focusHost.current?.() ?? false;
}
