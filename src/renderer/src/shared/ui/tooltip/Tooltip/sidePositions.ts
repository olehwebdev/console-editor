// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { GAP } from './constants';
import type { Box, TooltipSide } from './types';

/** Where a `width`×`height` tooltip goes on each side of the trigger, centred along it, before clamping. */
export const SIDE_POSITIONS: Record<TooltipSide, (anchor: DOMRect, width: number, height: number) => Box> = {
  top: (anchor, width, height) => ({ top: anchor.top - GAP - height, left: anchor.left + anchor.width / 2 - width / 2 }),
  bottom: (anchor, width) => ({ top: anchor.bottom + GAP, left: anchor.left + anchor.width / 2 - width / 2 }),
  left: (anchor, width, height) => ({ top: anchor.top + anchor.height / 2 - height / 2, left: anchor.left - GAP - width }),
  right: (anchor, _width, height) => ({ top: anchor.top + anchor.height / 2 - height / 2, left: anchor.right + GAP }),
};
