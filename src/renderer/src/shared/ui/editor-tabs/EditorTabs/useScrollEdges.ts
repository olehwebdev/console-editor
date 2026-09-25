// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { ScrollEdges } from './types';

/** Which edges the strip can scroll past, each of which gets a fade. */
export function useScrollEdges(scrollerRef: RefObject<HTMLDivElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 };
    setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
  }, [scrollerRef]);

  // Tabs opening, closing or changing width move the strip's scroll range: recheck after every commit.
  useLayoutEffect(() => {
    updateEdges();
  });

  // The strip's own scrolling and resizing move its edges too.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateEdges);
    };
  }, [scrollerRef, updateEdges]);

  return edges;
}
