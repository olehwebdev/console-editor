import { clampPosition } from '@/shared/lib';
import type { Placement, PopoverSide } from './types';

/** Space between the panel and its anchor, in px. */
const GAP = 8;
const VIEWPORT_PAD = 8;
/** Where a popover with no anchor opens: the viewport's width and height divided by these. */
const FALLBACK_DIVISOR = { x: 2, y: 3 } as const;

/** Beside (or below) the anchor, kept inside the viewport, scaling from the anchor. */
export function place(anchor: HTMLElement | null, side: PopoverSide, width: number, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = anchor?.getBoundingClientRect() ?? new DOMRect(vw / FALLBACK_DIVISOR.x, vh / FALLBACK_DIVISOR.y, 0, 0);
  const left = clampPosition(side === 'right' ? r.right + GAP : r.left, VIEWPORT_PAD, vw - width - VIEWPORT_PAD);
  const top = clampPosition(side === 'right' ? r.top : r.bottom + GAP, VIEWPORT_PAD, vh - height - VIEWPORT_PAD);
  return side === 'right'
    ? { left, top, originX: 0, originY: clampPosition(r.top + r.height / 2 - top, 0, height) }
    : { left, top, originX: clampPosition(r.left + r.width / 2 - left, 0, width), originY: 0 };
}
