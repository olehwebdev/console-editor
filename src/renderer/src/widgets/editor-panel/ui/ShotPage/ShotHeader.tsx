import type { Shot } from '@common/types';
import { shotDetail, useMinute } from '@/entities/shot';
import { CompareMenu } from './CompareMenu';
import { ScaleControl } from './ScaleControl';
import { ShotActions } from './ShotActions';
import { ShotName } from './ShotName';
import type { ShotZoom } from './types';
import { ZoomControls } from './ZoomControls';

export interface ShotHeaderProps {
  shot: Shot;
  zoom: ShotZoom;
  fitted: number;
  onZoom(zoom: ShotZoom): void;
}

/** A shot's name (renamed in place), where it came from, a design's scale, its zoom, comparing it, and what else can be done with it. */
export function ShotHeader({ shot, zoom, fitted, onZoom }: ShotHeaderProps) {
  const now = useMinute();
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <ShotName shot={shot} />
        <span className="truncate px-1 text-[12px] text-fg-subtle" title={shot.pageUrl ?? undefined}>
          {shotDetail(shot, now)}
          {shot.pageUrl ? ` · ${shot.pageUrl}` : ''}
        </span>
      </div>
      {shot.kind === 'design' ? <ScaleControl shot={shot} /> : null}
      <ZoomControls zoom={zoom} fitted={fitted} onZoom={onZoom} />
      <CompareMenu shot={shot} />
      <ShotActions shot={shot} />
    </header>
  );
}
