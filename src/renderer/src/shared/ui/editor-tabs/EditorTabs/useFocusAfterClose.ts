// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { findTab } from './findTab';
import type { EditorTabItem, PendingFocus } from './types';

/**
 * The tab a close key is closing and the neighbour to focus next: set by the
 * key, cleared by a pointer press on the strip.
 */
export function useFocusAfterClose(
  scrollerRef: RefObject<HTMLDivElement | null>,
  items: readonly EditorTabItem[],
  activeId: string | null | undefined,
) {
  const pendingFocus = useRef<PendingFocus | null>(null);

  // After a keyboard close, focus the neighbour once the closed tab is gone.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (pending && !items.some((item) => item.id === pending.closing)) {
      pendingFocus.current = null;
      const scroller = scrollerRef.current;
      (findTab(scroller, pending.next) ?? findTab(scroller, activeId))?.focus();
    }
  });

  return pendingFocus;
}
