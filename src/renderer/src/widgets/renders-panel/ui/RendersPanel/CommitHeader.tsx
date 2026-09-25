import { memo } from 'react';
import { formatTime } from '@/shared/lib';
import { FrameChip, frameKey } from '@/entities/frame';
import { triggerLabel } from '@/entities/inspector';
import { DURATION_DIGITS } from './constants';
import type { LogRowProps } from './types';

/** A commit's heading: its number, time, frame, what triggered it, and how many components (and how long) it took. */
export const CommitHeader = memo(function CommitHeader({ commit, resolve }: LogRowProps) {
  const count = commit.components.length + commit.more;
  const trigger = triggerLabel(commit);
  const { frame, label } = resolve(commit.frameId);
  return (
    <div className="flex h-full min-w-0 items-center gap-2 border-t border-line px-3 text-[12px]">
      <span className="shrink-0 font-mono text-fg-subtle">#{commit.id}</span>
      <span className="shrink-0 tabular-nums text-fg-subtle">{formatTime(commit.at)}</span>
      {frame ? <FrameChip frameKey={frameKey(frame)} label={label ?? frameKey(frame)} title={frame.url} /> : null}
      <span className="min-w-0 flex-1 truncate text-fg">{trigger ?? <span className="text-fg-subtle">no event</span>}</span>
      <span className="shrink-0 text-fg-subtle">
        {count} {count === 1 ? 'component' : 'components'}
        {commit.duration !== null ? ` · ${commit.duration.toFixed(DURATION_DIGITS)} ms` : ''}
      </span>
    </div>
  );
});
