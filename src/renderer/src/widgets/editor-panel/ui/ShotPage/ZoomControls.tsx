import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { IconButton } from '@/shared/ui/icon-button';
import { ZOOM_STEPS } from './constants';
import type { ShotZoom } from './types';

export interface ZoomControlsProps {
  zoom: ShotZoom;
  /** The zoom the image is shown at when fitted, to step from. */
  fitted: number;
  onZoom(zoom: ShotZoom): void;
}

/** Fit, actual size (as large as on the page), and a step smaller or larger. */
export function ZoomControls({ zoom, fitted, onZoom }: ZoomControlsProps) {
  const current = zoom === 'fit' ? fitted : zoom;
  const smaller = [...ZOOM_STEPS].reverse().find((step) => step < current - 1e-6);
  const larger = ZOOM_STEPS.find((step) => step > current + 1e-6);
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
      <IconButton icon={icons.ZoomOutIcon} label="Zoom out" size="sm" disabled={smaller === undefined} onClick={() => smaller !== undefined && onZoom(smaller)} />
      <span className="w-12 text-center font-mono text-[11px] text-fg-muted" data-testid="shot-zoom">
        {Math.round(current * 100)}%
      </span>
      <IconButton icon={icons.ZoomInIcon} label="Zoom in" size="sm" disabled={larger === undefined} onClick={() => larger !== undefined && onZoom(larger)} />
      <Button size="sm" variant={zoom === 'fit' ? 'secondary' : 'ghost'} onClick={() => onZoom('fit')}>
        Fit
      </Button>
      <Button size="sm" variant={zoom === 1 ? 'secondary' : 'ghost'} onClick={() => onZoom(1)}>
        100%
      </Button>
    </div>
  );
}
