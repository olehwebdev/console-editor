// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { WheelEvent } from 'react';

/** Pixels per line, for wheels that scroll by lines. */
const LINE_HEIGHT = 16;

/** A mostly vertical wheel scrolls the strip sideways, when it overflows. */
export function handleStripWheel(event: WheelEvent<HTMLDivElement>) {
  const el = event.currentTarget;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) return;
  el.scrollLeft += event.deltaMode === event.nativeEvent.DOM_DELTA_LINE ? event.deltaY * LINE_HEIGHT : event.deltaY;
}
