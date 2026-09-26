// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { FocusEvent as ReactFocusEvent } from 'react';
import type { MenuCloseReason, MenuPanelRefs } from './types';

interface MenuBlurContext extends Pick<MenuPanelRefs, 'panelRef' | 'ignoreRef' | 'live' | 'blurCheck'> {
  isPresent: boolean;
  onClose: (reason: MenuCloseReason) => void;
}

/** The panel's `onBlur`: focus moving outside the menu (and its trigger) closes it. Reads the refs as the event fires. */
export function handleMenuBlur(event: ReactFocusEvent<HTMLDivElement>, { isPresent, panelRef, ignoreRef, onClose, live, blurCheck }: MenuBlurContext): void {
  if (!isPresent) return;
  const next = event.relatedTarget as Node | null;
  if (next) {
    if (!panelRef.current?.contains(next) && !ignoreRef?.current?.contains(next)) onClose('blur');
    return;
  }
  // No new target: the window lost focus (the window `blur` listener closes with
  // `dismiss`, so focus comes back to the trigger), or focus fell to <body>.
  // Decide once the event has settled.
  const check = blurCheck.current;
  window.clearTimeout(check.timer);
  check.pending = true;
  check.timer = window.setTimeout(() => {
    check.pending = false;
    if (!document.hasFocus() || !live.current.isPresent) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body && (panelRef.current?.contains(focused) || ignoreRef?.current?.contains(focused))) return;
    live.current.onClose('blur');
  }, 0);
}
