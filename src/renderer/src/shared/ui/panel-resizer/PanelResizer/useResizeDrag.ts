import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from 'react';
import { MOUSE_BUTTON } from '@/shared/config';
import type { PanelResizerOrientation, PanelResizerProps, ResizeDrag } from './types';

/** The page's cursor while a drag is on, by the handle's orientation. */
const DRAG_CURSOR: Record<PanelResizerOrientation, string> = { vertical: 'col-resize', horizontal: 'row-resize' };

type ResizeDragOptions = Pick<PanelResizerProps, 'onResize' | 'onResizeStart' | 'onResizeEnd'> & {
  orientation: PanelResizerOrientation;
  disabled: boolean;
};

/** Pointer-captured dragging: every move reports its delta and the total since the drag started. */
export function useResizeDrag({ orientation, disabled, onResize, onResizeStart, onResizeEnd }: ResizeDragOptions) {
  const vertical = orientation === 'vertical';
  const [dragging, setDragging] = useState(false);
  /** The drag in progress, and the page's cursor to put back once it ends. */
  const drag = useRef<ResizeDrag | null>(null);

  const coord = (event: PointerEvent) => (vertical ? event.clientX : event.clientY);

  const endDrag = () => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    document.documentElement.style.cursor = current.cursor;
    setDragging(false);
    onResizeEnd?.();
  };

  // Unmounted mid-drag (panel closed): still end it.
  const endDragOnUnmount = useEffectEvent(endDrag);
  useEffect(() => () => endDragOnUnmount(), []);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.defaultPrevented || event.button !== MOUSE_BUTTON.primary) return;
    event.preventDefault(); // no text selection, no focus ring from the mouse
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = coord(event);
    const root = document.documentElement;
    drag.current = { pointerId: event.pointerId, start: at, last: at, cursor: root.style.cursor };
    // Keep the resize cursor while the pointer outruns the handle.
    root.style.cursor = DRAG_CURSOR[orientation];
    setDragging(true);
    onResizeStart?.();
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const at = coord(event);
    const delta = at - current.last;
    if (!delta) return;
    current.last = at;
    onResize(delta, at - current.start);
  };

  return { dragging, startDrag, moveDrag, endDrag };
}
