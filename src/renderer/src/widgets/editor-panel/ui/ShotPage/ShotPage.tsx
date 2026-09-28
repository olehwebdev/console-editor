import { useState } from 'react';
import type { PageTabOf } from '@/entities/editor-tab';
import { useShotStore } from '@/entities/shot';
import { ShotHeader } from './ShotHeader';
import { ShotViewer } from './ShotViewer';
import type { PixelUnderPointer, ShotZoom } from './types';

/** Room around the image in the pane (its margin on each side). */
const PANE_MARGIN = 48;

/** A capture's or design's page: its image to zoom into, the pixel under the pointer, and what can be done with it. */
export function ShotPage({ page }: { page: PageTabOf<'shot'> }) {
  const shot = useShotStore((s) => s.shots.find((x) => x.id === page.shotId));
  const [zoom, setZoom] = useState<ShotZoom>('fit');
  const [paneWidth, setPaneWidth] = useState(0);
  const [pixel, setPixel] = useState<PixelUnderPointer | null>(null);
  if (!shot) return <div className="grid h-full place-items-center bg-surface-editor text-[13px] text-fg-subtle">This capture was deleted.</div>;

  // Fitted to the pane's width, never enlarged.
  const fitted = paneWidth > PANE_MARGIN ? Math.min(1, (paneWidth - PANE_MARGIN) / (shot.width / shot.scale)) : 1;
  return (
    <div className="flex h-full flex-col bg-surface-editor" data-testid="shot-page">
      <ShotHeader shot={shot} zoom={zoom} fitted={fitted} onZoom={setZoom} />
      <ShotViewer shot={shot} zoom={zoom === 'fit' ? fitted : zoom} onWidth={setPaneWidth} onPixel={setPixel} />
      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-line px-4 font-mono text-[11px] text-fg-muted" data-testid="shot-footer">
        <span>
          {shot.width} × {shot.height} px{shot.scale === 1 ? '' : ` at ${shot.scale}×`}
        </span>
        {pixel ? (
          <span className="flex items-center gap-1.5" data-testid="shot-pixel">
            {Math.round(pixel.x)}, {Math.round(pixel.y)}
            {pixel.color ? (
              <>
                <span className="size-3 rounded-sm ring-1 ring-line" style={{ background: pixel.color }} />
                {pixel.color}
              </>
            ) : null}
          </span>
        ) : null}
      </footer>
    </div>
  );
}
