// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useLayoutEffect, type RefObject } from 'react';
import type { ToastCardProps } from './types';

/** Reports the card's natural height to the stack, and again whenever it changes. */
export function useNaturalHeight(contentRef: RefObject<HTMLDivElement | null>, id: string, onHeight: ToastCardProps['onHeight']) {
  // Natural height comes from the content; the background is what gets squeezed while stacked.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => onHeight(id, el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentRef, id, onHeight]);
}
