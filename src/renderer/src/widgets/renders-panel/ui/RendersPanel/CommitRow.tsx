import type { ConsoleFrame, RenderCommit } from '@common/types';
import { formatTime } from '@/shared/lib';
import { FrameChip, frameKey } from '@/entities/frame';
import { triggerLabel } from '@/entities/inspector';
import { DURATION_DIGITS } from './constants';
import { RenderedRow } from './RenderedRow';

/** One commit: its number, time, frame and what triggered it, then each component that mounted, rendered or was skipped. */
export function CommitRow({ commit, frame, label }: { commit: RenderCommit; frame: ConsoleFrame | undefined; label: string | undefined }) {
  const count = commit.components.length + commit.more;
  const trigger = triggerLabel(commit.trigger);
  return (
    <div className="flex flex-col border-b border-line py-1.5" data-testid="render-commit">
      <div className="flex h-6 min-w-0 items-center gap-2 px-3 text-[12px]">
        <span className="shrink-0 font-mono text-fg-subtle">#{commit.id}</span>
        <span className="shrink-0 tabular-nums text-fg-subtle">{formatTime(commit.at)}</span>
        {frame ? <FrameChip frameKey={frameKey(frame)} label={label ?? frameKey(frame)} title={frame.url} /> : null}
        <span className="min-w-0 flex-1 truncate text-fg">{trigger ?? <span className="text-fg-subtle">no event</span>}</span>
        <span className="shrink-0 text-fg-subtle">
          {count} {count === 1 ? 'component' : 'components'}
          {commit.duration !== null ? ` · ${commit.duration.toFixed(DURATION_DIGITS)} ms` : ''}
        </span>
      </div>
      {commit.components.map((component, index) => (
        <RenderedRow key={index} component={component} />
      ))}
      {commit.more ? <span className="pl-6 text-[12px] text-fg-subtle">{commit.more} more not listed</span> : null}
    </div>
  );
}
