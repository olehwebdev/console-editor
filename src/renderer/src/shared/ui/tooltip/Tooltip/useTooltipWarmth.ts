// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useEffect } from 'react';
import { warmth } from './warmth';

/** How long after a tooltip closes the next one still opens instantly. */
const WARM_WINDOW_MS = 300;

/** Counts the tooltip among the open ones while it shows, so the next one skips the delay. */
export function useTooltipWarmth(open: boolean, tracksWarmth: boolean) {
  // Count open tooltips and start the warm window when this one closes.
  useEffect(() => {
    if (!open || !tracksWarmth) return;
    warmth.openTooltips += 1;
    return () => {
      warmth.openTooltips -= 1;
      warmth.warmUntil = performance.now() + WARM_WINDOW_MS;
    };
  }, [open, tracksWarmth]);
}
