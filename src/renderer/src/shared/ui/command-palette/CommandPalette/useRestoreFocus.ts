// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Hands focus back to whatever had it before the palette opened: returns the
 * function a close from inside calls, and does it itself on a close from outside.
 */
export function useRestoreFocus(isPresent: boolean, panelRef: RefObject<HTMLDivElement | null>, inputRef: RefObject<HTMLInputElement | null>) {
  // Whatever had focus before the palette opened gets it back on close.
  const [restoreTo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  const restoreFocus = useCallback(() => {
    if (restoreTo && restoreTo !== document.body && restoreTo.isConnected) restoreTo.focus({ preventScroll: true });
    else inputRef.current?.blur();
  }, [restoreTo, inputRef]);

  // Closed from outside (hotkey toggle, parent state): hand focus back if it is still ours.
  useEffect(() => {
    if (isPresent) return;
    const focused = document.activeElement;
    if (!focused || focused === document.body || panelRef.current?.contains(focused)) restoreFocus();
  }, [isPresent, restoreFocus, panelRef]);

  return restoreFocus;
}
