// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { Box } from './types';

/** The pill's box for `row`, in the container's scroll space; null once either is gone. */
export function measureRow(container: HTMLElement | null, row: HTMLElement, inset: number): Box | null {
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
}
