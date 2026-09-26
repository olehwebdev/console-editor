import { memo, useState } from 'react';
import type { StoreAction } from '@common/types';
import { icons } from '@/shared/config';
import { cn, formatTime } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { FrameChip, frameKey } from '@/entities/frame';
import { appFrame, useInspectorStore } from '@/entities/inspector';
import { CallStack, CodeLink } from '@/features/open-resource';
import { DURATION_DIGITS, LIBRARY_LABEL } from './constants';
import type { ResolveFrame } from './types';

/**
 * One store action: its number, time, frame, store, type and payload, and how long the store took, with a
 * link to the app's own call that dispatched it; then what it changed. The whole stack on request. It
 * re-renders when the call it links to changes as its stack's originals become known, not for others'.
 */
export const ActionRow = memo(function ActionRow({ action, resolve }: { action: StoreAction; resolve: ResolveFrame }) {
  const [stackOpen, setStackOpen] = useState(false);
  const dispatchedAt = useInspectorStore((s) => appFrame(action.stack, s.origins));
  const { frame, label } = resolve(action.frameId);
  return (
    <div className="flex flex-col border-b border-line py-1.5" data-testid="store-action">
      <div className="flex h-6 min-w-0 items-center gap-2 px-3 text-[12px]">
        <button
          type="button"
          aria-expanded={stackOpen}
          aria-label={stackOpen ? 'Hide the stack' : 'Show the stack'}
          onClick={() => setStackOpen(!stackOpen)}
          disabled={!action.stack.length}
          className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-30"
        >
          <Icon icon={icons.ChevronRightIcon} size={12} className={cn('transition-transform duration-150', stackOpen && 'rotate-90')} />
        </button>
        <span className="shrink-0 font-mono text-fg-subtle">#{action.id}</span>
        <span className="shrink-0 tabular-nums text-fg-subtle">{formatTime(action.at)}</span>
        {frame ? <FrameChip frameKey={frameKey(frame)} label={label ?? frameKey(frame)} title={frame.url} /> : null}
        <span className="max-w-40 shrink-0 truncate rounded bg-hover px-1.5 text-[11px] text-fg-muted" title={LIBRARY_LABEL[action.library]}>
          {action.store}
        </span>
        <span className="min-w-0 shrink truncate font-mono font-medium text-fg" data-testid="store-action-type">
          {action.type}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-fg-muted">{action.payload}</span>
        {action.duration !== null ? <span className="shrink-0 text-fg-subtle">{action.duration.toFixed(DURATION_DIGITS)} ms</span> : null}
        <CodeLink location={dispatchedAt} />
      </div>
      {action.changes.map((change) => (
        <div key={change.path} className="flex min-h-5 min-w-0 items-center gap-2 pl-9 pr-3 font-mono text-[12px]" data-testid="store-change">
          <span className="shrink-0 text-fg">{change.path}</span>
          <span className="min-w-0 truncate text-fg-subtle">
            {change.from} → <span className="text-fg-muted">{change.to}</span>
          </span>
        </div>
      ))}
      {stackOpen ? <CallStack stack={action.stack} className="ml-9 mr-3 mt-1" /> : null}
    </div>
  );
});
