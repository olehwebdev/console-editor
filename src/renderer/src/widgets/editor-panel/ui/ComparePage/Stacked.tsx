import { useState } from 'react';
import { shotUrl } from '@/entities/shot';
import { cssSize } from './cssSize';
import { HALFWAY, SLIDER_STEP } from './constants';
import type { CompareViewProps } from './types';

export interface StackedProps extends CompareViewProps {
  /** Swipe: the other shows right of a line you move. Onion: the other shows over the base, as opaque as you set. */
  mode: 'swipe' | 'onion';
}

/** The other shot laid over the base at its offset: swiped across it, or faded over it, with a slider for either. */
export function Stacked({ base, other, zoom, offset, mode }: StackedProps) {
  const [amount, setAmount] = useState(HALFWAY);
  const baseSize = cssSize(base);
  const otherSize = cssSize(other);
  const width = Math.max(baseSize.width, otherSize.width + offset.x);
  const height = Math.max(baseSize.height, otherSize.height + offset.y);
  // Swipe clips the other at the line, in the stack's coordinates (the other starts `offset.x` in).
  const clipLeft = Math.max(0, amount * width - offset.x) * zoom;
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={`compare-${mode}`}>
      <label className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-4 text-[12px] text-fg-muted">
        {mode === 'swipe' ? 'Line' : 'Opacity'}
        <input type="range" min={0} max={1} step={SLIDER_STEP} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-60 accent-accent" aria-label={mode === 'swipe' ? 'Where the line is' : 'How opaque the top image is'} />
        <span className="font-mono">{Math.round(amount * 100)}%</span>
      </label>
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <div className="relative m-6 shadow-overlay" style={{ width: width * zoom, height: height * zoom }}>
          <img src={shotUrl(base)} alt={base.name} draggable={false} style={{ width: baseSize.width * zoom, height: baseSize.height * zoom }} className="absolute left-0 top-0 max-w-none" />
          <img
            src={shotUrl(other)}
            alt={other.name}
            draggable={false}
            style={{
              width: otherSize.width * zoom,
              height: otherSize.height * zoom,
              left: offset.x * zoom,
              top: offset.y * zoom,
              opacity: mode === 'onion' ? amount : 1,
              clipPath: mode === 'swipe' ? `inset(0 0 0 ${clipLeft}px)` : undefined,
            }}
            className="absolute max-w-none"
          />
          {mode === 'swipe' ? <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-accent" style={{ left: amount * width * zoom }} /> : null}
        </div>
      </div>
    </div>
  );
}
