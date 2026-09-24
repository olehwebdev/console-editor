import type { KeyboardEvent } from 'react';
import { cn } from '@/shared/lib';
import { ResizerAccentLine } from './ResizerAccentLine';
import { RESIZER_KEY_HANDLERS } from './resizerKeyHandlers';
import { ResizerGrip } from './ResizerGrip';
import type { PanelResizerProps } from './types';
import { useResizeDrag } from './useResizeDrag';

// Arrow-key steps in px, unless `step` / `largeStep` say otherwise.
const STEP = 16;
const LARGE_STEP = 64;
/** Classes that take the handle out of flow, so it needs no negative margins. */
const POSITIONED = /(^|\s)(absolute|fixed)(\s|$)/;

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
  const { dragging, startDrag, moveDrag, endDrag } = useResizeDrag({ orientation, disabled, onResize, onResizeStart, onResizeEnd });

  const positioned = POSITIONED.test(className ?? '');

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
      onPointerDown={(event) => {
        onPointerDown?.(event);
        startDrag(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        moveDrag(event);
      }}
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
      <ResizerAccentLine vertical={vertical} />
      <ResizerGrip vertical={vertical} disabled={disabled} />
    </div>
  );
}
