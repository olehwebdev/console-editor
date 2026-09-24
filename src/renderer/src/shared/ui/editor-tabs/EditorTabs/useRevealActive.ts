// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useLayoutEffect, type RefObject } from 'react';
import { findTab } from './findTab';
import { revealTab } from './revealTab';

/** Keeps the active tab scrolled into view as the selection moves. */
export function useRevealActive(scrollerRef: RefObject<HTMLDivElement | null>, activeId: string | null | undefined, reduce: boolean) {
  // The strip's scroll position follows the active tab (measured, so before paint).
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    revealTab(scroller, findTab(scroller, activeId), reduce);
  }, [scrollerRef, activeId, reduce]);
}
