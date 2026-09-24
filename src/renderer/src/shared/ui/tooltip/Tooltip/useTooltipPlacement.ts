// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useCallback, useEffectEvent, useLayoutEffect, useState, type RefObject } from 'react';
import { KEY } from '@/shared/config';
import { computePlacement } from './computePlacement';
import type { Placement, TooltipSide } from './types';

interface TooltipPlacementOptions {
  open: boolean;
  side: TooltipSide;
  /** The `display: contents` wrapper around the trigger. */
  wrapperRef: RefObject<HTMLSpanElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  /** Closes the tooltip. */
  hide: () => void;
}

/** Where the open tooltip sits beside its trigger; null until it has been measured. */
export function useTooltipPlacement({ open, side, wrapperRef, surfaceRef, hide }: TooltipPlacementOptions): Placement | null {
  const [placement, setPlacement] = useState<Placement | null>(null);

  const place = useCallback(() => {
    const anchor = wrapperRef.current?.firstElementChild;
    const surface = surfaceRef.current;
    if (!anchor || !surface) return;
    const next = computePlacement(anchor.getBoundingClientRect(), surface.offsetWidth, surface.offsetHeight, side);
    setPlacement((prev) => (prev && prev.top === next.top && prev.left === next.left && prev.side === next.side ? prev : next));
  }, [wrapperRef, surfaceRef, side]);

  const dismiss = useEffectEvent(() => hide());

  // While open: placed before paint (the surface renders hidden until then) and
  // again whenever its size changes (content swap, font load); Escape, scroll,
  // resize and window blur dismiss it. A pinned (controlled) tooltip cannot be
  // dismissed from here, so it follows its trigger instead.
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const surface = surfaceRef.current;
    const observer = new ResizeObserver(place);
    if (surface) observer.observe(surface);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === KEY.escape) dismiss();
    };
    const onMove = () => {
      place();
      dismiss();
    };
    const onBlur = () => dismiss();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, { capture: true, passive: true });
    window.addEventListener('resize', onMove);
    window.addEventListener('blur', onBlur);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, place, surfaceRef]);

  return placement;
}
