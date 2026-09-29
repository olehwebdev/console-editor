import type { KeyboardEvent } from 'react';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { ShotThumb, useShotStore } from '@/entities/shot';
import { removeOverlay, updateOverlay } from '@/features/shot/overlay';
import { NUDGE, OPACITY_STEP, SHIFT_NUDGE } from './constants';
import { OffsetField } from './OffsetField';

/**
 * Under the preview's toolbar while a design is over the page: how see-through it is, blending and inverting it, where
 * it is (the arrow keys nudge it while the bar has focus, Shift by 10), whether it scrolls with the page, the page at
 * its width, hiding it, and taking it off.
 */
export function OverlayBar() {
  const overlay = useShotStore((s) => s.overlay);
  if (!overlay) return null;
  const { settings } = overlay;
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NUDGE[event.key];
    if (!step || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const times = event.shiftKey ? SHIFT_NUDGE : 1;
    void updateOverlay({ x: settings.x + step.x * times, y: settings.y + step.y * times });
  };
  return (
    <div role="toolbar" aria-label="Design over the page" tabIndex={0} onKeyDown={nudge} className="flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-2 outline-none focus-visible:bg-hover [scrollbar-width:none]" data-testid="overlay-bar">
      <ShotThumb shot={{ id: overlay.shotId, updatedAt: 0 }} size={20} className="rounded-[5px]" />
      <span className="max-w-40 shrink truncate text-[12px] text-fg" title={overlay.name}>
        {overlay.name}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={OPACITY_STEP}
        value={settings.opacity}
        onChange={(event) => void updateOverlay({ opacity: Number(event.target.value) })}
        aria-label="How see-through the design is"
        className="w-24 shrink-0 accent-accent"
        data-testid="overlay-opacity"
      />
      <span className="w-9 shrink-0 font-mono text-[11px] text-fg-muted">{Math.round(settings.opacity * 100)}%</span>
      <IconButton icon={icons.ContrastIcon} label="Difference: what matches the page goes black" size="sm" active={settings.blend === 'difference'} onClick={() => void updateOverlay({ blend: settings.blend === 'difference' ? 'normal' : 'difference' })} data-testid="overlay-difference" />
      <OffsetField axis="x" value={settings.x} onChange={(x) => void updateOverlay({ x })} />
      <OffsetField axis="y" value={settings.y} onChange={(y) => void updateOverlay({ y })} />
      <IconButton icon={icons.AnchorIcon} label={settings.attached === 'page' ? 'Scrolls with the page' : 'Stays put while the page scrolls'} size="sm" active={settings.attached === 'page'} onClick={() => void updateOverlay({ attached: settings.attached === 'page' ? 'viewport' : 'page' })} data-testid="overlay-attached" />
      <IconButton icon={icons.FitWidthIcon} label={`The page at the design's width (${overlay.width} px)`} size="sm" active={settings.fitWidth} onClick={() => void updateOverlay({ fitWidth: !settings.fitWidth })} data-testid="overlay-fit" />
      <span className="flex-1" />
      <IconButton icon={settings.hidden ? icons.HideIcon : icons.ShowIcon} label={settings.hidden ? 'Show the design' : 'Hide the design'} size="sm" onClick={() => void updateOverlay({ hidden: !settings.hidden })} data-testid="overlay-hide" />
      <IconButton icon={icons.CloseIcon} label="Take the design off the page" size="sm" onClick={() => void removeOverlay()} data-testid="overlay-remove" />
    </div>
  );
}
