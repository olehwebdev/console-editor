// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ToastRecord } from '../store';
import type { StackLayout } from './types';

/** Space (px) between cards while the stack is fanned out. */
const GAP = 8;

/** Places the cards from their measured heights: newest in front, each fanned-out card above the last. */
export function stackLayout(toasts: readonly ToastRecord[], heights: Record<string, number>, visibleCount: number): StackLayout {
  // Newest first: index 0 is the front card.
  const ordered = [...toasts].reverse();
  const shown = Math.max(1, visibleCount);
  const frontHeight = ordered[0] ? (heights[ordered[0].id] ?? 0) : 0;
  const offsets: number[] = [];
  let expandedHeight = 0;
  ordered.forEach((t, index) => {
    offsets.push(expandedHeight);
    if (index < shown) expandedHeight += (heights[t.id] ?? 0) + GAP;
  });
  expandedHeight = Math.max(0, expandedHeight - GAP);
  return { ordered, shown, frontHeight, offsets, expandedHeight };
}
