import { useCallback, useLayoutEffect, useRef } from 'react';
import { api } from '@/shared/api';
import { setNativeViewRect } from '@/shared/lib';

const NO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };
/** Frames the host must stay put before position tracking stops. */
const SETTLE_FRAMES = 10;

export interface NativeViewHostOptions {
  /** Give the view no bounds; the host's area is still reported to floating UI. */
  hidden: boolean;
  hasPage: boolean;
  suspended: boolean;
  /** See `PagePreviewProps.layoutKey`. */
  layoutKey: unknown;
}

/**
 * Keeps the native page view on the box of the element the returned ref is
 * attached to, and reports that box as the area floating UI can't draw over.
 */
export function useNativeViewHost({ hidden, hasPage, suspended, layoutKey }: NativeViewHostOptions) {
  const host = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    const el = host.current;
    const r = el && hasPage && !suspended ? el.getBoundingClientRect() : undefined;
    const area = r ? { x: r.left, y: r.top, width: r.width, height: r.height } : NO_BOUNDS;
    api.setPageBounds(hidden ? NO_BOUNDS : area);
    // Floating UI can't be drawn over the native view. Reported even while a
    // snapshot stands in for it, so whatever froze the page keeps it frozen.
    setNativeViewRect(area);
  }, [hidden, hasPage, suspended]);

  // Keep the view on the host box: now, whenever the host or the window is
  // resized, and frame by frame until the host settles, since moves that don't
  // resize it (a neighbouring panel animating) never reach the ResizeObserver.
  useLayoutEffect(() => {
    sync();
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener('resize', sync);
    let last = el.getBoundingClientRect();
    let still = 0;
    let frame = 0;
    const track = () => {
      const r = el.getBoundingClientRect();
      if (r.x !== last.x || r.y !== last.y || r.width !== last.width || r.height !== last.height) {
        last = r;
        still = 0;
        sync();
      } else still++;
      frame = still < SETTLE_FRAMES ? requestAnimationFrame(track) : 0;
    };
    frame = requestAnimationFrame(track);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [sync, layoutKey]);

  // The view goes with the panel (the preview was hidden), or it would stay drawn over what takes its place.
  // Not in the effect above: its cleanup runs before every re-sync, and would hide the view in between.
  useLayoutEffect(
    () => () => {
      api.setPageBounds(NO_BOUNDS);
      setNativeViewRect(null);
    },
    [],
  );

  return host;
}
