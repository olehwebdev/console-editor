// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { clamp } from './clamp';
import { TRIGGER_GAP } from './constants';
import type { MenuAnchor, Placement } from './types';

const VIEWPORT_PAD = 8;

/** Fits the panel in the viewport: flips before it shifts, and keeps the scale origin on the anchor. */
export function place(anchor: MenuAnchor, width: number, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (anchor.type === 'point') {
    const { x, y } = anchor;
    let left = x + width > vw - VIEWPORT_PAD ? x - width : x;
    let top = y + height > vh - VIEWPORT_PAD ? y - height : y;
    left = clamp(left, VIEWPORT_PAD, vw - width - VIEWPORT_PAD);
    top = clamp(top, VIEWPORT_PAD, vh - height - VIEWPORT_PAD);
    return { left, top, originX: clamp(x - left, 0, width), originY: clamp(y - top, 0, height) };
  }

  const el = anchor.element.current;
  const rect = el?.getBoundingClientRect() ?? new DOMRect(vw / 2, vh / 3, 0, 0);
  const below = rect.bottom + TRIGGER_GAP;
  const above = rect.top - TRIGGER_GAP - height;
  let top = anchor.side === 'bottom' ? below : above;
  if (anchor.side === 'bottom' && below + height > vh - VIEWPORT_PAD && above >= VIEWPORT_PAD) top = above;
  if (anchor.side === 'top' && above < VIEWPORT_PAD && below + height <= vh - VIEWPORT_PAD) top = below;
  let left = anchor.align === 'start' ? rect.left : rect.right - width;
  left = clamp(left, VIEWPORT_PAD, vw - width - VIEWPORT_PAD);
  top = clamp(top, VIEWPORT_PAD, vh - height - VIEWPORT_PAD);
  const opensDown = top >= rect.top;
  return {
    left,
    top,
    originX: clamp(rect.left + rect.width / 2 - left, 0, width),
    originY: opensDown ? 0 : height,
  };
}
