// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { NativeViewRect } from '@/shared/lib';
import { clamp } from './clamp';
import { EDGE } from './constants';
import { overlapArea } from './overlapArea';
import { SIDE_POSITIONS } from './sidePositions';
import type { Box, TooltipSide } from './types';

/** Position on `side`, clamped to the window, and slid along the trigger's edge off the native view when that is enough. */
export function positionOn(anchor: DOMRect, width: number, height: number, side: TooltipSide, avoid: NativeViewRect | null): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let { top, left } = SIDE_POSITIONS[side](anchor, width, height);
  top = clamp(top, EDGE, vh - EDGE - height);
  left = clamp(left, EDGE, vw - EDGE - width);

  if (avoid && overlapArea({ top, left }, width, height, avoid) > 0) {
    if (side === 'top' || side === 'bottom') {
      const center = anchor.left + anchor.width / 2;
      if (center <= avoid.x) left = clamp(Math.min(left, avoid.x - EDGE - width), EDGE, vw - EDGE - width);
      else if (center >= avoid.x + avoid.width) left = clamp(Math.max(left, avoid.x + avoid.width + EDGE), EDGE, vw - EDGE - width);
    } else {
      const center = anchor.top + anchor.height / 2;
      if (center <= avoid.y) top = clamp(Math.min(top, avoid.y - EDGE - height), EDGE, vh - EDGE - height);
      else if (center >= avoid.y + avoid.height) top = clamp(Math.max(top, avoid.y + avoid.height + EDGE), EDGE, vh - EDGE - height);
    }
  }
  return { top: Math.round(top), left: Math.round(left) };
}
