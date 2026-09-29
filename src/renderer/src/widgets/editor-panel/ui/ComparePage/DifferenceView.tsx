import { useRef, useState } from 'react';
import { useImageDiff } from '@/features/shot/compare';
import { DiffCanvas } from './DiffCanvas';
import { DiffStats } from './DiffStats';
import { sourceOf } from './sourceOf';
import type { CompareViewProps } from './types';

/** Room kept above an area scrolled to, so its box shows whole. */
const SCROLL_MARGIN = 24;

/**
 * Where two shots differ: differing pixels in red over the faded base (anti-aliasing in yellow), how many, and each
 * area to step through.
 */
export function DifferenceView({ base, other, zoom, offset }: CompareViewProps) {
  const diff = useImageDiff(sourceOf(base), sourceOf(other), offset, true);
  const [at, setAt] = useState(0);
  const paneRef = useRef<HTMLDivElement>(null);
  const regions = diff.status === 'done' ? diff.regions : [];
  const region = regions[Math.min(at, regions.length - 1)];
  const go = (step: number) => {
    const next = (Math.min(at, regions.length - 1) + step + regions.length) % regions.length;
    setAt(next);
    paneRef.current?.scrollTo({ left: Math.max(0, regions[next].x * zoom - SCROLL_MARGIN), top: Math.max(0, regions[next].y * zoom - SCROLL_MARGIN), behavior: 'smooth' });
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="compare-difference">
      <DiffStats diff={diff} onStep={go} />
      <div ref={paneRef} className="min-h-0 flex-1 overflow-auto bg-surface">
        {diff.status === 'done' ? (
          <div className="relative m-6 w-fit shadow-overlay">
            <DiffCanvas image={diff.image} zoom={zoom} />
            {region ? <div aria-hidden className="pointer-events-none absolute rounded-sm ring-2 ring-accent" style={{ left: region.x * zoom, top: region.y * zoom, width: region.width * zoom, height: region.height * zoom }} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
