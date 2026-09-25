// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ToastRecord } from '../store';

export interface ToastStackProps {
  /** Placement and size of the stack. Default `bottom-4 left-4 w-[340px]`; e.g. pass `bottom-9 left-14`. */
  className?: string;
  /** Cards shown at once (collapsed and expanded). Default 3. */
  visibleCount?: number;
  /**
   * Freeze the native page view while toasts are on screen. Default false:
   * toasts are non-modal, and freezing would show a still of the page while,
   * say, a "Saved, reloading…" toast is up. Turn on only if the stack's
   * placement can overlap the page view.
   */
  registerOverlay?: boolean;
}

export interface ToastCardProps {
  toast: ToastRecord;
  index: number;
  expanded: boolean;
  hidden: boolean;
  frontHeight: number;
  /** Distance from the bottom of the stack when expanded. */
  offset: number;
  maxIndex: number;
  /** Natural height, once measured. */
  height: number | undefined;
  onHeight: (id: string, height: number) => void;
  onDragChange: (dragging: boolean) => void;
  handOffFocus: (card: HTMLElement, toNeighbour: boolean) => void;
}

/** Where the cards sit: newest first, how many show, and the stack's height collapsed and fanned out. */
export interface StackLayout {
  /** Newest first: index 0 is the front card. */
  ordered: ToastRecord[];
  shown: number;
  frontHeight: number;
  /** Each card's distance from the bottom of the stack when expanded. */
  offsets: number[];
  expandedHeight: number;
}
