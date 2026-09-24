import type { ConsoleFrame } from '@common/types';
import { cn } from '@/shared/lib';
import { FRAME_DOT, frameKey, frameTone } from '@/entities/frame';
import { useConsoleFilter } from '@/features/filter-console';
import type { ProblemCount } from './problemCounts';

export interface FrameFilterBarProps {
  frames: readonly ConsoleFrame[];
  labels: ReadonlyMap<string, string>;
  counts: ReadonlyMap<string, ProblemCount>;
}

// Actions never change, so they are read once instead of subscribed to.
const { toggleFrame, showAllFrames } = useConsoleFilter.getState();

const CHIP = 'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/50';

/** Which frames' rows show: all, or the ones picked; each with its errors and warnings so far. */
export function FrameFilterBar({ frames, labels, counts }: FrameFilterBarProps) {
  const picked = useConsoleFilter((s) => s.frameKeys);
  return (
    <div role="group" aria-label="Frames shown" className="flex min-w-0 items-center gap-1 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none]">
      <button type="button" aria-pressed={!picked.length} onClick={showAllFrames} className={cn(CHIP, picked.length ? 'text-fg-muted hover:bg-hover' : 'bg-surface-raised text-fg')}>
        All frames
      </button>
      {frames.map((frame) => {
        const key = frameKey(frame);
        const on = picked.includes(key);
        const count = counts.get(key);
        return (
          <button
            key={frame.id}
            type="button"
            aria-pressed={on}
            data-testid="console-frame-filter"
            title={frame.url || undefined}
            onClick={() => toggleFrame(key)}
            className={cn(CHIP, on ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:bg-hover')}
          >
            <span className={cn('size-2 shrink-0 rounded-full', FRAME_DOT[frameTone(key)])} />
            <span className="max-w-[160px] truncate">{labels.get(frame.id)}</span>
            {count?.errors ? <span className="tabular-nums text-danger">{count.errors}</span> : null}
            {count?.warnings ? <span className="tabular-nums text-warning">{count.warnings}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
