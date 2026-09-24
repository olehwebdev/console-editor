// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { EXITING_ATTR } from './constants';

const CONTROL = 'button';
/** Inside a stacked or hidden card (inert), or one on its way out. */
const UNFOCUSABLE = `[inert], [${EXITING_ATTR}]`;

/** The first control of a card that can take focus (skips stacked, hidden and exiting cards). */
export function focusableIn(card: Element): HTMLElement | null {
  for (const button of card.querySelectorAll<HTMLElement>(CONTROL)) {
    if (!button.closest(UNFOCUSABLE)) return button;
  }
  return null;
}
