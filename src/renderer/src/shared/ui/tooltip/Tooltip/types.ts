// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ReactElement, ReactNode } from 'react';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface Placement {
  top: number;
  left: number;
  side: TooltipSide;
}

export type Box = Omit<Placement, 'side'>;

export interface TooltipProps {
  /** Tooltip text. When empty (and no shortcut) the trigger renders alone. */
  content: ReactNode;
  /**
   * Preferred side. Default `top`. Flips to the opposite (then a perpendicular) side
   * when there is no room, or when it would land on the native page view.
   */
  side?: TooltipSide;
  /** Shortcut rendered with <Kbd>, e.g. `['mod', 'S']`. */
  shortcut?: string[];
  /** The trigger: one element that can take `aria-describedby`. */
  children: ReactElement;
  /** Open delay while "cold" (ms). Default 400. Moving between tooltips is instant. */
  delay?: number;
  /** Suppress the tooltip (the trigger still renders). */
  disabled?: boolean;
  /** Controlled open state (e.g. to pin a tooltip open for review). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Point the trigger's `aria-describedby` at the tooltip while it is open.
   * Turn off when the content repeats the trigger's accessible name (IconButton does).
   */
  describeTrigger?: boolean;
  className?: string;
}
