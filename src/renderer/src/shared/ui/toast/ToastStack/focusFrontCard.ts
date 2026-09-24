// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { RefObject } from 'react';
import { focusableIn } from './focusableIn';

/** Focuses the front card that can take focus, remembering where focus came from if outside the stack. */
export function focusFrontCard(list: HTMLOListElement | null, returnFocus: RefObject<HTMLElement | null>): boolean {
  if (!list) return false;
  let target: HTMLElement | null = null;
  for (const card of list.children) {
    target = focusableIn(card);
    if (target) break;
  }
  if (!target) return false;
  const active = document.activeElement;
  if (!list.contains(active)) returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
  target.focus({ preventScroll: true });
  return true;
}
