// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useCallback, useEffect, useRef, type FocusEvent, type PointerEvent } from 'react';
import { isWarm } from './isWarm';

interface TriggerEventsOptions {
  setOpen: (open: boolean) => void;
  /** Open delay while cold, in ms. */
  delay: number;
  /** The tooltip can't open now (disabled, or nothing to show). */
  blocked: boolean;
}

/**
 * How the trigger opens and closes its tooltip: hover and keyboard focus open it
 * (after `delay` while cold, at once while warm); leaving, blur and a press close it.
 * Returns the wrapper's handlers, and `hide` for everything else that closes it.
 */
export function useTriggerEvents({ setOpen, delay, blocked }: TriggerEventsOptions) {
  const timer = useRef<number | undefined>(undefined);
  // A press hides the tooltip until the pointer leaves the trigger.
  const suppressed = useRef(false);

  const cancelTimer = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  const show = () => {
    if (blocked || suppressed.current) return;
    cancelTimer();
    if (isWarm()) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
    setOpen(false);
  }, [setOpen]);

  // A delayed open still pending when the tooltip unmounts must not fire.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handlers = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      show();
    },
    onPointerLeave: () => {
      suppressed.current = false;
      hide();
    },
    onPointerDown: () => {
      suppressed.current = true;
      hide();
    },
    onFocus: (event: FocusEvent) => {
      // Keyboard focus only: a click focuses too, and must not reopen the label.
      let visible = true;
      try {
        visible = (event.target as Element).matches(':focus-visible');
      } catch {
        /* selector unsupported */
      }
      if (visible) show();
    },
    onBlur: hide,
  };

  return { hide, handlers };
}
