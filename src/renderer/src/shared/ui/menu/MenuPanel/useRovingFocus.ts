// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useEffect, type RefObject } from 'react';

/** Room kept above or below the highlighted row when the panel scrolls to it, in px. */
const SCROLL_MARGIN = 4;

/** Keeps DOM focus on the highlighted row (the panel itself with none), scrolled into view. */
export function useRovingFocus(
  panelRef: RefObject<HTMLDivElement | null>,
  itemRefs: RefObject<(HTMLDivElement | null)[]>,
  active: number,
  isPresent: boolean,
) {
  // Roving focus: the highlighted row owns DOM focus; with no highlight the panel does.
  // The panel is scrolled by hand so focusing never scrolls anything behind it.
  useEffect(() => {
    if (!isPresent) return;
    const panel = panelRef.current;
    const item = active >= 0 ? itemRefs.current[active] : null;
    (item ?? panel)?.focus({ preventScroll: true });
    if (!panel || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top - SCROLL_MARGIN;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight + SCROLL_MARGIN;
  }, [panelRef, itemRefs, active, isPresent]);
}
