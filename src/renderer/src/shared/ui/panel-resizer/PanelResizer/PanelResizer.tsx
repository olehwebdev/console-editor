import { useEffect, useEffectEvent, useRef, useState, type ComponentPropsWithRef, type KeyboardEvent, type PointerEvent } from 'react';
import { MOUSE_BUTTON } from '@/shared/config';
import { cn } from '@/shared/lib';
import { RESIZER_KEY_HANDLERS } from './resizerKeyHandlers';
import type { PanelResizerOrientation } from './types';

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

// Arrow-key steps in px, unless `step` / `largeStep` say otherwise.
const STEP = 16;
const LARGE_STEP = 64;
/** Classes that take the handle out of flow, so it needs no negative margins. */
const POSITIONED = /(^|\s)(absolute|fixed)(\s|$)/;
/** The grip's three dots. */
const GRIP_DOTS = [0, 1, 2];

/**
 * Window-splitter handle. An 8 px hit area with a grip (three dots in a small
 * tab that bulges out of the panel's border) that says it can be dragged, and
 * a 2 px accent line that lights up on hover (after a short intent delay),
 * while dragging and on keyboard focus, the tab's outline lighting up with it. In flow it takes no width (negative margins, overlaps both
 * neighbours); pass `absolute …` classes to pin it to a panel edge instead.
 * Pointer-captured drags, arrow keys (Shift = large step), Home/End with
 * `value`/`min`/`max`, Enter / double-click reset.
 */
export function PanelResizer({
  onResize,
  onResizeStart,
  onResizeEnd,
  onReset,
  orientation = 'vertical',
  step = STEP,
  largeStep = LARGE_STEP,
  value,
  min,
  max,
  hairline = false,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Resize panel',
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  onDoubleClick,
  ...rest
}: PanelResizerProps) {
  const vertical = orientation === 'vertical';
  const [dragging, setDragging] = useState(false);
  /** The drag in progress, and the page's cursor to put back once it ends. */
  const drag = useRef<{ pointerId: number; start: number; last: number; cursor: string } | null>(null);

  const positioned = POSITIONED.test(className ?? '');

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

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented || event.button !== MOUSE_BUTTON.primary) return;
    event.preventDefault(); // no text selection, no focus ring from the mouse
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = coord(event);
    const root = document.documentElement;
    drag.current = { pointerId: event.pointerId, start: at, last: at, cursor: root.style.cursor };
    // Keep the resize cursor while the pointer outruns the handle.
    root.style.cursor = vertical ? 'col-resize' : 'row-resize';
    setDragging(true);
    onResizeStart?.();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const at = coord(event);
    const delta = at - current.last;
    if (!delta) return;
    current.last = at;
    onResize(delta, at - current.start);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (disabled || event.defaultPrevented) return;
    const keys = RESIZER_KEY_HANDLERS[orientation];
    if (!Object.hasOwn(keys, event.key)) return;
    keys[event.key](event, {
      amount: event.shiftKey ? largeStep : step,
      value,
      min,
      max,
      onReset,
      resize: (delta) => {
        event.preventDefault();
        if (!delta) return;
        // A key step is a whole resize: report it and its end (e.g. to persist), no start.
        onResize(delta, delta);
        onResizeEnd?.();
      },
    });
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-valuenow={value !== undefined ? Math.round(value) : undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      data-dragging={dragging || undefined}
      data-orientation={orientation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        endDrag();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        endDrag();
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        endDrag();
      }}
      onKeyDown={handleKeyDown}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        if (!disabled) onReset?.();
      }}
      className={cn(
        'group/resizer relative z-20 shrink-0 touch-none select-none outline-none',
        vertical ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize',
        !positioned && (vertical ? '-mx-1 self-stretch' : '-my-1 self-stretch'),
        disabled && 'pointer-events-none cursor-default',
        className,
      )}
      {...rest}
    >
      {hairline ? (
        <span
          aria-hidden
          className={cn('pointer-events-none absolute bg-line', vertical ? 'inset-y-0 left-1/2 w-px' : 'inset-x-0 top-1/2 h-px')}
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bg-accent opacity-0 transition-opacity duration-150 ease-out-expo',
          vertical ? 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2' : 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2',
          'group-hover/resizer:opacity-100 group-hover/resizer:delay-200',
          'group-focus-visible/resizer:opacity-100 group-focus-visible/resizer:delay-0',
          'group-data-[dragging]/resizer:opacity-100 group-data-[dragging]/resizer:delay-0',
        )}
      />
      {/*
        The grip: a tab over the panel's border (the pixel past the centre) that bulges out before it, never
        past it: what lies further can be hidden (the page's native view starts there; the sidebar clips its
        edge). Part of the handle, so it can be grabbed too.
      */}
      <span
        aria-hidden
        data-grip
        className={cn(
          'absolute flex items-center justify-center gap-[3px] border-line-strong bg-surface-raised text-fg-muted',
          'transition-[color,border-color] duration-150 ease-out-expo',
          vertical
            ? 'right-[calc(50%-1px)] top-1/2 -mt-3 h-6 w-[7px] flex-col rounded-l-full border border-r-0'
            : 'bottom-[calc(50%-1px)] left-1/2 -ml-3 h-[7px] w-6 flex-row rounded-t-full border border-b-0',
          'group-hover/resizer:border-accent group-hover/resizer:text-fg group-hover/resizer:delay-200',
          'group-focus-visible/resizer:border-accent group-focus-visible/resizer:text-fg group-focus-visible/resizer:delay-0',
          'group-data-[dragging]/resizer:border-accent group-data-[dragging]/resizer:text-fg group-data-[dragging]/resizer:delay-0',
          disabled && 'opacity-40',
        )}
      >
        {GRIP_DOTS.map((dot) => (
          <span key={dot} className="size-0.5 shrink-0 rounded-full bg-current" />
        ))}
      </span>
    </div>
  );
}
