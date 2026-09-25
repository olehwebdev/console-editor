import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { frameLabels, useFrameStore } from '@/entities/frame';
import { useRenderLog } from '@/entities/inspector';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { LOG_OVERSCAN, LOG_ROW_HEIGHT, MAX_SHOWN, NO_NAMES } from './constants';
import { groupRows } from './groupRows';
import { logLayout } from './logLayout';
import { LOG_ROW_VIEWS } from './logRowViews';
import { rowAt } from './rowAt';
import { rowKind } from './rowKind';
import type { ResolveFrame } from './types';

/**
 * The commits recorded, the newest first (the last `MAX_SHOWN`), each with its frame; or what recording
 * shows. Virtualized by row (a commit's heading, each of its components), so a log of commits of hundreds
 * of components draws only the rows in view; each commit's rows drawn stay together in one element.
 */
export function CommitList() {
  const recording = useRenderLog((s) => s.recording);
  const commits = useRenderLog((s) => s.commits);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const shown = useMemo(() => commits.slice(-MAX_SHOWN).reverse(), [commits]);
  const layout = useMemo(() => logLayout(shown), [shown]);
  // One function while the frames stay: the rows drawn don't re-render for a new batch.
  const resolve = useMemo<ResolveFrame>(() => {
    const labels = frameLabels(frames, names);
    return (frameId) => ({ frame: frames.find((f) => f.id === frameId), label: frameId ? labels.get(frameId) : undefined });
  }, [frames, names]);
  const scroller = useRef<HTMLDivElement | null>(null);
  const virtual = useVirtualizer({
    count: layout.count,
    getScrollElement: () => scroller.current,
    estimateSize: (index) => {
      const { commit, offset } = rowAt(layout, index);
      return LOG_ROW_HEIGHT[rowKind(shown[commit]!, offset)];
    },
    overscan: LOG_OVERSCAN,
    getItemKey: (index) => {
      const { commit, offset } = rowAt(layout, index);
      return `${shown[commit]!.id}:${offset}`;
    },
  });
  if (!shown.length) {
    return (
      <p className="px-3 py-2 text-[12px] text-fg-subtle">
        {recording
          ? 'Recording. Use the page: each React commit shows here, with why each component rendered.'
          : 'Record to see each React commit in the page and its frames: what triggered it, and why each component rendered.'}
      </p>
    );
  }
  return (
    <div ref={scroller} className="h-full overflow-y-auto" data-testid="renders-log">
      <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
        {groupRows(virtual.getVirtualItems(), layout).map(({ commit, rows }) => (
          // A commit's rows, placed each on its own: this element only holds them together.
          <div key={shown[commit]!.id} className="contents" data-testid="render-commit">
            {rows.map(({ item, offset }) => {
              const View = LOG_ROW_VIEWS[rowKind(shown[commit]!, offset)];
              return (
                <div key={item.key} className="absolute inset-x-0" style={{ top: item.start, height: item.size }}>
                  <View commit={shown[commit]!} offset={offset} resolve={resolve} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
