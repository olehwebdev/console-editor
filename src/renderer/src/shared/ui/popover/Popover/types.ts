import type { ReactNode } from 'react';

export type PopoverSide = 'right' | 'bottom';

export interface PopoverProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /**
   * The element it opens beside; Esc gives focus back to it. Presses on it are
   * left to it (usually a toggle), rather than closing the popover as outside ones do.
   */
  anchor: HTMLElement | null;
  /** Default `right`: beside the anchor, top edges aligned. `bottom`: below it, left edges aligned. */
  side?: PopoverSide;
  /** Accessible name of the panel. */
  label: string;
  /** The panel's content; give its first field `autoFocus`. */
  children: ReactNode;
  /** Extra classes for the panel. */
  className?: string;
}

export interface Placement {
  left: number;
  top: number;
  originX: number;
  originY: number;
}
