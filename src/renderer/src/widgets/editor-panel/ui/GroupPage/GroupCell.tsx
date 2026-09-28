import type { Shot } from '@common/types';
import { Spinner } from '@/shared/ui/spinner';
import { shotUrl } from '@/entities/shot';
import { openCompare, useImageDiff } from '@/features/shot/compare';
import { DiffCanvas } from '../ComparePage/DiffCanvas';
import { differingShare } from '../ComparePage/differingShare';
import { sourceOf } from '../ComparePage/sourceOf';
import { NO_OFFSET } from './constants';
import { shotLabel } from './shotLabel';
import type { GroupView } from './types';

export interface GroupCellProps {
  shot: Shot;
  base: Shot;
  view: GroupView;
}

/** A capture of the group: its image or its difference from the baseline, and how much differs; choosing it compares the two. */
export function GroupCell({ shot, base, view }: GroupCellProps) {
  const isBase = shot.id === base.id;
  const diff = useImageDiff(sourceOf(base), sourceOf(shot), NO_OFFSET, !isBase);
  const share = diff.status === 'done' ? `${differingShare(diff.differing, diff.total)} differ` : null;
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface" data-testid="group-cell" data-shot-id={shot.id}>
      <button type="button" disabled={isBase} onClick={() => openCompare(base, shot)} className="max-h-96 overflow-hidden bg-white outline-none focus-visible:ring-2 focus-visible:ring-accent/50" aria-label={`Compare ${shotLabel(shot)} with ${shotLabel(base)}`}>
        {view === 'differences' && diff.status === 'done' ? (
          <div className="[&_canvas]:!h-auto [&_canvas]:!w-full">
            <DiffCanvas image={diff.image} zoom={1} />
          </div>
        ) : (
          <img src={shotUrl(shot)} alt="" draggable={false} className="block w-full" />
        )}
      </button>
      <footer className="flex items-center gap-2 border-t border-line px-3 py-2 text-[12px]">
        <span className="min-w-0 flex-1 truncate text-fg">{shotLabel(shot)}</span>
        {isBase ? <span className="text-fg-subtle">Baseline</span> : null}
        {!isBase && diff.status === 'failed' ? <span className="text-danger">Could not compare</span> : null}
        {!isBase && (diff.status === 'working' || diff.status === 'idle') ? <Spinner size={12} label="Comparing" /> : null}
        {share ? (
          <span className="font-medium text-fg-muted" data-testid="group-share">
            {share}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
