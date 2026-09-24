// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useRef, type PointerEvent } from 'react';
import { assignRef, cn } from '@/shared/lib';
import { CONTAINER_ATTR } from './constants';
import { InHoverHighlight } from './InHoverHighlight';
import type { HoverHighlightProps } from './types';
import { useFocusEntry } from './useFocusEntry';
import { useHoverPill } from './useHoverPill';

/** Roles whose rows are one composite widget: the container becomes the Tab entry point. */
const COMPOSITE_ROLES = new Set(['tree', 'listbox', 'grid', 'treegrid']);

/**
 * Wraps a vertical list and draws one pill behind the hovered row that glides
 * from row to row (SPRING_LAYOUT) and fades out when the pointer leaves.
 *
 * Rows opt in with `data-hover-row` (TreeRow does it for you). The pill is
 * placed by measuring the hovered row, not by a `layoutId` per row, so it works
 * in virtualized lists whose rows are absolutely positioned / translated: make
 * the HoverHighlight the virtualizer's inner (sized, relative) element.
 * Hovering never re-renders React: position lives in motion values.
 */
export function HoverHighlight({
  ref,
  children,
  className,
  pillClassName,
  inset = 0,
  disabled = false,
  focusEntry,
  role,
  tabIndex,
  onPointerOver,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: HoverHighlightProps) {
  const reduce = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const entry = focusEntry ?? (role !== undefined && COMPOSITE_ROLES.has(role));
  const { focusWithin, handleFocus, handleBlur, handleKeyDown } = useFocusEntry({ entry, onFocus, onBlur, onKeyDown });
  const pill = useHoverPill({ containerRef, inset, reduce, disabled });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    onPointerOver?.(event);
    // Touch has no hover; a tap would leave a stuck pill.
    if (disabled || event.pointerType === 'touch') return;
    pill.pointAt(event.currentTarget, event.target as Element);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    pill.hide();
  };

  return (
    <InHoverHighlight.Provider value={!disabled}>
      <div
        ref={setRefs}
        role={role}
        {...{ [CONTAINER_ATTR]: '' }}
        tabIndex={entry ? (focusWithin ? -1 : 0) : tabIndex}
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn('relative isolate flex flex-col outline-none', className)}
        {...rest}
      >
        <motion.div
          aria-hidden
          className={cn('pointer-events-none absolute left-0 top-0 -z-10 rounded-md bg-hover', pillClassName)}
          style={pill.style}
        />
        {children}
      </div>
    </InHoverHighlight.Provider>
  );
}
