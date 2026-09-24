// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface Placement {
  top: number;
  left: number;
  side: TooltipSide;
}

export type Box = Omit<Placement, 'side'>;
