import { useCallback, useState } from 'react';
import type { PageTabOf } from '@/entities/editor-tab';
import { useShotStore } from '@/entities/shot';
import { openCompare } from '@/features/shot/compare';
import type { ShotZoom } from '../ShotPage/types';
import { CompareHeader } from './CompareHeader';
import { PANE_MARGIN } from './constants';
import { cssSize } from './cssSize';
import { DifferenceView } from './DifferenceView';
import { SideBySide } from './SideBySide';
import { Stacked } from './Stacked';
import type { CompareMode } from './types';

/** Two captures or designs compared: side by side, swiped, faded over each other, or as their difference. */
export function ComparePage({ page }: { page: PageTabOf<'compare'> }) {
  const base = useShotStore((s) => s.shots.find((x) => x.id === page.baseId));
  const other = useShotStore((s) => s.shots.find((x) => x.id === page.otherId));
  const [mode, setMode] = useState<CompareMode>('difference');
  const [zoom, setZoom] = useState<ShotZoom>('fit');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [paneWidth, setPaneWidth] = useState(0);
  // The pane's width, for fitting: observed for as long as the pane exists.
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (!base || !other) return <div className="grid h-full place-items-center bg-surface-editor text-[13px] text-fg-subtle">One of these was deleted.</div>;

  // Side by side, each gets half the pane; stacked, both together are fitted.
  const room = (mode === 'side' ? paneWidth / 2 : paneWidth) - PANE_MARGIN;
  const wide = mode === 'side' ? Math.max(cssSize(base).width, cssSize(other).width) : Math.max(cssSize(base).width, cssSize(other).width + offset.x);
  const fitted = room > 0 ? Math.min(1, room / wide) : 1;
  const view = { base, other, zoom: zoom === 'fit' ? fitted : zoom, offset };
  return (
    <div ref={measure} className="flex h-full flex-col bg-surface-editor" data-testid="compare-page">
      <CompareHeader base={base} other={other} mode={mode} onMode={setMode} zoom={zoom} fitted={fitted} onZoom={setZoom} offset={offset} onOffset={setOffset} onSwap={() => openCompare(other, base)} />
      {mode === 'side' ? <SideBySide {...view} /> : null}
      {mode === 'swipe' || mode === 'onion' ? <Stacked {...view} mode={mode} /> : null}
      {mode === 'difference' ? <DifferenceView {...view} /> : null}
    </div>
  );
}
