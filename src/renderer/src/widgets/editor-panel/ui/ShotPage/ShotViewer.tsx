import { useCallback, useRef, type PointerEvent } from 'react';
import type { Shot } from '@common/types';
import { shotUrl } from '@/entities/shot';
import { PIXEL_GRID_FROM } from './constants';
import type { PixelUnderPointer } from './types';
import { usePixelProbe } from './usePixelProbe';

export interface ShotViewerProps {
  shot: Shot;
  /** CSS pixels shown per CSS pixel of the page. */
  zoom: number;
  /** The pane's width changed (to fit the image to). */
  onWidth(width: number): void;
  onPixel(pixel: PixelUnderPointer | null): void;
}

/** A shot's image at a zoom, on a checkerboard; pixels drawn square with a grid between them from 8×, and the one under the pointer read. */
export function ShotViewer({ shot, zoom, onWidth, onPixel }: ShotViewerProps) {
  const probe = usePixelProbe(shot.id);
  // The latest move's number: a colour read for an earlier one arrives late and is dropped.
  const movesRef = useRef(0);
  const width = (shot.width / shot.scale) * zoom;
  const height = (shot.height / shot.scale) * zoom;
  const cell = zoom / shot.scale;

  // The pane's width, for fitting: observed for as long as the pane exists.
  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const observer = new ResizeObserver(([entry]) => onWidth(entry.contentRect.width));
      observer.observe(el);
      return () => observer.disconnect();
    },
    [onWidth],
  );

  const hover = async (event: PointerEvent<HTMLImageElement>) => {
    const x = Math.floor((event.nativeEvent.offsetX / zoom) * shot.scale);
    const y = Math.floor((event.nativeEvent.offsetY / zoom) * shot.scale);
    const move = ++movesRef.current;
    onPixel({ x: x / shot.scale, y: y / shot.scale, color: null });
    const color = await probe(x, y);
    if (move === movesRef.current) onPixel({ x: x / shot.scale, y: y / shot.scale, color });
  };

  return (
    <div ref={measure} className="min-h-0 flex-1 overflow-auto bg-surface" data-testid="shot-viewer">
      <div className="relative m-6 w-fit shadow-overlay" style={{ width, height }}>
        <img
          src={shotUrl(shot)}
          alt={shot.name}
          draggable={false}
          onPointerMove={(event) => void hover(event)}
          onPointerLeave={() => onPixel(null)}
          style={{ width, height, imageRendering: zoom >= PIXEL_GRID_FROM ? 'pixelated' : 'auto' }}
          className="block max-w-none select-none"
        />
        {zoom >= PIXEL_GRID_FROM ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'linear-gradient(to right, rgb(0 0 0 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.25) 1px, transparent 1px)', backgroundSize: `${cell}px ${cell}px` }}
          />
        ) : null}
      </div>
    </div>
  );
}
