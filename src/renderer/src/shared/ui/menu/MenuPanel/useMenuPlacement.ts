// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useLayoutEffect, useState, type RefObject } from 'react';
import { initialPlacement } from './initialPlacement';
import { place } from './place';
import type { MenuAnchor, Placement } from './types';

/** Where the panel sits: against its anchor at first, then fitted to the viewport once it can be measured. */
export function useMenuPlacement(panelRef: RefObject<HTMLDivElement | null>, anchor: MenuAnchor, itemCount: number): Placement {
  const [placement, setPlacement] = useState<Placement>(() => initialPlacement(anchor));

  // Measure with offset sizes (transform-free: the panel is mid scale-in) and fit before paint.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const next = place(anchor, el.offsetWidth, el.offsetHeight);
    setPlacement((prev) =>
      prev.left === next.left && prev.top === next.top && prev.originX === next.originX && prev.originY === next.originY
        ? prev
        : next,
    );
  }, [panelRef, anchor, itemCount]);

  return placement;
}
