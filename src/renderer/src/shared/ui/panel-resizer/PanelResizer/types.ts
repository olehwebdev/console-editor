import type { ComponentPropsWithRef, KeyboardEvent } from 'react';

export type PanelResizerOrientation = 'vertical' | 'horizontal';

export interface PanelResizerProps extends Omit<ComponentPropsWithRef<'div'>, 'onResize' | 'children'> {
  /**
   * Called while dragging (every pointer move) and per arrow-key step.
   * `deltaPx` is the movement since the previous call (+ = right / down);
   * `totalPx` is the movement since the drag started, handy for clamping
   * without drift: `setWidth(clamp(startWidth + totalPx))`.
   */
  onResize: (deltaPx: number, totalPx: number) => void;
  /** A pointer drag starts, e.g. hide a native view that would swallow the pointer. */
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  /** Double-click or Enter, e.g. restore the default size. */
  onReset?: () => void;
  /** `vertical` (default): a vertical bar resizing left/right (col-resize); `horizontal`: row-resize. */
  orientation?: PanelResizerOrientation;
  /** Arrow-key step in px (default 16); Shift uses `largeStep` (default 64). */
  step?: number;
  largeStep?: number;
  /** Current size, for `aria-valuenow` and Home/End (with `min`/`max`). */
  value?: number;
  min?: number;
  max?: number;
  /** Draw a 1 px hairline at rest (off by default: panels usually bring their own border). */
  hairline?: boolean;
  disabled?: boolean;
}

/** A pointer drag in progress, and the page's cursor to put back once it ends. */
export interface ResizeDrag {
  pointerId: number;
  /** Where the drag started and where the last move reported, along the resize axis (px). */
  start: number;
  last: number;
  cursor: string;
}

/** What a key on the handle acts on, read when it is pressed. */
export interface ResizerKeyContext {
  /** One arrow-key step: `largeStep` with Shift, else `step`. */
  amount: number;
  value: number | undefined;
  min: number | undefined;
  max: number | undefined;
  onReset: (() => void) | undefined;
  /** Takes the key and reports a resize by `delta` px (nothing for 0). */
  resize: (delta: number) => void;
}

export type ResizerKeyHandler = (event: KeyboardEvent<HTMLDivElement>, resizer: ResizerKeyContext) => void;
