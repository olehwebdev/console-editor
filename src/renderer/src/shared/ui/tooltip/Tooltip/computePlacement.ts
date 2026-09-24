// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { getNativeViewRect } from '@/shared/lib';
import { EDGE, GAP } from './constants';
import { overlapArea } from './overlapArea';
import { positionOn } from './positionOn';
import type { Placement, TooltipSide } from './types';

const OPPOSITE: Record<TooltipSide, TooltipSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

// Sides tried after the preferred one and its opposite.
const PERPENDICULAR: Record<TooltipSide, [TooltipSide, TooltipSide]> = {
  top: ['right', 'left'],
  bottom: ['right', 'left'],
  left: ['top', 'bottom'],
  right: ['bottom', 'top'],
};

/**
 * Preferred side first, then its opposite, then the perpendicular sides. A side
 * qualifies when it has room in the window and the tooltip would not land on the
 * native page view (drawn above the renderer, it would hide the tooltip). When
 * none is clear, the side with the least overlap wins.
 */
export function computePlacement(anchor: DOMRect, width: number, height: number, preferred: TooltipSide): Placement {
  const room: Record<TooltipSide, number> = {
    top: anchor.top - GAP - EDGE,
    bottom: window.innerHeight - anchor.bottom - GAP - EDGE,
    left: anchor.left - GAP - EDGE,
    right: window.innerWidth - anchor.right - GAP - EDGE,
  };
  const avoid = getNativeViewRect();
  let best: Placement | null = null;
  let bestOverlap = Infinity;
  for (const side of [preferred, OPPOSITE[preferred], ...PERPENDICULAR[preferred]]) {
    if (room[side] < (side === 'top' || side === 'bottom' ? height : width)) continue;
    const box = positionOn(anchor, width, height, side, avoid);
    const overlap = avoid ? overlapArea(box, width, height, avoid) : 0;
    if (overlap === 0) return { ...box, side };
    if (overlap < bestOverlap) {
      best = { ...box, side };
      bestOverlap = overlap;
    }
  }
  return best ?? { ...positionOn(anchor, width, height, preferred, avoid), side: preferred };
}
