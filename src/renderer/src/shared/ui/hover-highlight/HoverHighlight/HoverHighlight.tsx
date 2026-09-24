// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { KEY } from '@/shared/config';
import { assignRef, cn, DURATION, EASE_OUT } from '@/shared/lib';
import { InHoverHighlight } from './InHoverHighlight';
import { setValue } from './setValue';

/** Rows opt in with this attribute (`data-hover-row`); `data-hover-row="false"` opts a row out. */
export const HOVER_ROW_ATTR = 'data-hover-row';
/** Spread on a row element to opt it in: `<div {...hoverRow}>`. */
export const hoverRow = { [HOVER_ROW_ATTR]: '' } as const;

const ROW_SELECTOR = `[${HOVER_ROW_ATTR}]:not([${HOVER_ROW_ATTR}="false"])`;
const CONTAINER_ATTR = 'data-hover-highlight';
/** Roles whose rows are one composite widget: the container becomes the Tab entry point. */
const COMPOSITE_ROLES = new Set(['tree', 'listbox', 'grid', 'treegrid']);

/** Keys that, pressed on the container itself, move focus into its rows. */
const ENTRY_KEYS: ReadonlySet<string> = new Set([KEY.arrowDown, KEY.arrowUp, KEY.home, KEY.end]);
/** Below this the pill counts as hidden, so it appears in place instead of gliding. */
const VISIBLE_OPACITY = 0.05;

export interface HoverHighlightProps extends ComponentPropsWithRef<'div'> {
  /** Classes for the moving pill (default: `rounded-md bg-hover`). */
  pillClassName?: string;
  /** Extra horizontal reach of the pill on each side of the row, in px (negative shrinks it). */
  inset?: number;
  /** Stop tracking and hide the pill. */
  disabled?: boolean;
  /**
   * Make the container the keyboard entry point of its rows: Tab lands on the
   * container, which forwards focus to the row with `tabindex="0"`, the
   * selected row, or the first row. On by default for `role="tree" | "listbox" | "grid"`.
   */
  focusEntry?: boolean;
}

type Box = { left: number; top: number; width: number; height: number };

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
  const activeRow = useRef<HTMLElement | null>(null);
  const entry = focusEntry ?? (role !== undefined && COMPOSITE_ROLES.has(role));
  const [focusWithin, setFocusWithin] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const opacity = useMotionValue(0);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const measure = useCallback(
    (row: HTMLElement): Box | null => {
      const container = containerRef.current;
      if (!container || !row.isConnected) return null;
      // Rects (not offsetTop) so translated virtual rows and nested offset
      // parents measure right; the pill lives in the container's scroll space.
      const c = container.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      return {
        left: r.left - c.left - container.clientLeft + container.scrollLeft - inset,
        top: r.top - c.top - container.clientTop + container.scrollTop,
        width: row.offsetWidth + inset * 2,
        height: row.offsetHeight,
      };
    },
    [inset],
  );

  const hide = useCallback(() => {
    activeRow.current = null;
    if (opacity.get() !== 0 || opacity.isAnimating()) animate(opacity, 0, { duration: DURATION.base, ease: EASE_OUT });
  }, [opacity]);

  const moveTo = useCallback(
    (row: HTMLElement, allowGlide: boolean) => {
      const box = measure(row);
      if (!box) return hide();
      activeRow.current = row;
      // Glide only while the pill is on screen; from hidden it appears in place.
      const glide = allowGlide && !reduce && opacity.get() > VISIBLE_OPACITY;
      setValue(x, box.left, glide);
      setValue(y, box.top, glide);
      setValue(width, box.width, glide);
      setValue(height, box.height, glide);
      if (opacity.get() !== 1 || opacity.isAnimating()) animate(opacity, 1, { duration: DURATION.fast, ease: EASE_OUT });
    },
    [measure, hide, reduce, x, y, width, height, opacity],
  );

  // Keep the pill glued to its row when the list reflows or scrolls inside the container; disabled, it hides.
  useEffect(() => {
    if (disabled) {
      hide();
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    const resync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const row = activeRow.current;
        if (row) moveTo(row, false);
      });
    };
    const observer = new ResizeObserver(resync);
    observer.observe(container);
    container.addEventListener('scroll', resync, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener('scroll', resync, { capture: true });
    };
  }, [disabled, moveTo, hide]);

  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    onPointerOver?.(event);
    // Touch has no hover; a tap would leave a stuck pill.
    if (disabled || event.pointerType === 'touch') return;
    const container = event.currentTarget;
    const target = event.target as Element;
    const row = target.closest<HTMLElement>(ROW_SELECTOR);
    if (row && row.closest(`[${CONTAINER_ATTR}]`) === container) {
      if (row !== activeRow.current || opacity.get() < 1) moveTo(row, true);
    } else if (target !== container) {
      // Over non-row content (a header, an empty note). Gaps between rows
      // (the container itself) keep the pill where it is.
      hide();
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    hide();
  };

  const pickEntryRow = (container: HTMLElement): HTMLElement | null =>
    container.querySelector<HTMLElement>(`${ROW_SELECTOR}[tabindex="0"]`) ??
    container.querySelector<HTMLElement>(`${ROW_SELECTOR}[aria-selected="true"]`) ??
    container.querySelector<HTMLElement>(ROW_SELECTOR);

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (!entry) return;
    const container = event.currentTarget;
    if (event.target !== container) {
      setFocusWithin(true);
      return;
    }
    // Only forward keyboard arrivals; a click on the padding must not jump the scroll.
    if (container.matches(':focus-visible')) pickEntryRow(container)?.focus();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!entry) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setFocusWithin(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!entry || event.defaultPrevented || event.target !== event.currentTarget) return;
    if (ENTRY_KEYS.has(event.key)) {
      const row = pickEntryRow(event.currentTarget);
      if (row) {
        event.preventDefault();
        row.focus();
      }
    }
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
          style={{ x, y, width, height, opacity }}
        />
        {children}
      </div>
    </InHoverHighlight.Provider>
  );
}
