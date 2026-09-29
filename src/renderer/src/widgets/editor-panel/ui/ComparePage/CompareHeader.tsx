import type { Shot } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { PaneTabs } from '@/shared/ui/pane-tabs';
import type { ShotZoom } from '../ShotPage/types';
import { ZoomControls } from '../ShotPage/ZoomControls';
import { COMPARE_MODES } from './constants';
import { OffsetControls } from './OffsetControls';
import type { CompareMode } from './types';

export interface CompareHeaderProps {
  base: Shot;
  other: Shot;
  mode: CompareMode;
  onMode(mode: CompareMode): void;
  zoom: ShotZoom;
  fitted: number;
  onZoom(zoom: ShotZoom): void;
  offset: { x: number; y: number };
  onOffset(offset: { x: number; y: number }): void;
  onSwap(): void;
}

/** Which two shots are compared, how, at what zoom, the top one moved by how much; and swapping them. */
export function CompareHeader({ base, other, mode, onMode, zoom, fitted, onZoom, offset, onOffset, onSwap }: CompareHeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-1 border-b border-line px-4 pt-2">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-fg" data-testid="compare-title">
          {base.name} <span className="text-fg-subtle">↔</span> {other.name}
        </h1>
        <IconButton icon={icons.JumpIcon} label="Swap them" size="sm" onClick={onSwap} data-testid="compare-swap" />
        <span className="flex-1" />
        {mode === 'side' ? null : <OffsetControls offset={offset} onOffset={onOffset} />}
        <ZoomControls zoom={zoom} fitted={fitted} onZoom={onZoom} />
      </div>
      <div className="h-8">
        <PaneTabs<CompareMode> tabs={COMPARE_MODES} value={mode} onChange={onMode} label="Compare" />
      </div>
    </header>
  );
}
