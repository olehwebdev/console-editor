// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { animate, useMotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { DURATION, EASE_OUT } from '@/shared/lib';
import { CONTAINER_ATTR, ROW_SELECTOR } from './constants';
import { measureRow } from './measureRow';
import { setValue } from './setValue';

/** Below this the pill counts as hidden, so it appears in place instead of gliding. */
const VISIBLE_OPACITY = 0.05;

interface HoverPillOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** Extra horizontal reach on each side of the row, in px. */
  inset: number;
  reduce: boolean;
  disabled: boolean;
}

/**
 * The pill's position, size and fade, in motion values (hovering never re-renders React):
 * `pointAt` moves it to the row under the pointer, `hide` fades it out.
 */
export function useHoverPill({ containerRef, inset, reduce, disabled }: HoverPillOptions) {
  const activeRow = useRef<HTMLElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const opacity = useMotionValue(0);

  const hide = useCallback(() => {
    activeRow.current = null;
    if (opacity.get() !== 0 || opacity.isAnimating()) animate(opacity, 0, { duration: DURATION.medium2, ease: EASE_OUT });
  }, [opacity]);

  const moveTo = useCallback(
    (row: HTMLElement, allowGlide: boolean) => {
      const box = measureRow(containerRef.current, row, inset);
      if (!box) return hide();
      activeRow.current = row;
      // Glide only while the pill is on screen; from hidden it appears in place.
      const glide = allowGlide && !reduce && opacity.get() > VISIBLE_OPACITY;
      setValue(x, box.left, glide);
      setValue(y, box.top, glide);
      setValue(width, box.width, glide);
      setValue(height, box.height, glide);
      if (opacity.get() !== 1 || opacity.isAnimating()) animate(opacity, 1, { duration: DURATION.short3, ease: EASE_OUT });
    },
    [containerRef, inset, hide, reduce, x, y, width, height, opacity],
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
  }, [containerRef, disabled, moveTo, hide]);

  /** Moves the pill to the row `target` is in, if it is one of this container's rows. */
  const pointAt = (container: HTMLElement, target: Element) => {
    const row = target.closest<HTMLElement>(ROW_SELECTOR);
    if (row && row.closest(`[${CONTAINER_ATTR}]`) === container) {
      if (row !== activeRow.current || opacity.get() < 1) moveTo(row, true);
    } else if (target !== container) {
      // Over non-row content (a header, an empty note). Gaps between rows
      // (the container itself) keep the pill where it is.
      hide();
    }
  };

  return { style: { x, y, width, height, opacity }, hide, pointAt };
}
