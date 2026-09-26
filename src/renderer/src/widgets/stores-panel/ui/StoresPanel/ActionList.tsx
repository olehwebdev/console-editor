import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { useFrameOf } from '@/entities/frame';
import { useStoreLog } from '@/entities/inspector';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { ActionRow } from './ActionRow';
import { ACTION_FRAME_HEIGHT, ACTION_HEADING_HEIGHT, CHANGE_ROW_HEIGHT, LOG_OVERSCAN, MAX_SHOWN, NO_NAMES } from './constants';

/**
 * The actions recorded, the newest first (the last `MAX_SHOWN`), each with its frame; or what recording
 * shows. Virtualized, each action measured once drawn (its stack opens in place), so a long log draws only
 * the actions in view.
 */
export function ActionList() {
  const actions = useStoreLog((s) => s.actions);
  const recording = useStoreLog((s) => s.recording);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const resolve = useFrameOf(names);
  const shown = useMemo(() => actions.slice(-MAX_SHOWN).reverse(), [actions]);
  const scroller = useRef<HTMLDivElement | null>(null);
  const virtual = useVirtualizer({
    count: shown.length,
    getScrollElement: () => scroller.current,
    estimateSize: (index) => ACTION_FRAME_HEIGHT + ACTION_HEADING_HEIGHT + shown[index]!.changes.length * CHANGE_ROW_HEIGHT,
    overscan: LOG_OVERSCAN,
    getItemKey: (index) => shown[index]!.id,
  });
  if (!shown.length) {
    return (
      <p className="px-3 py-2 text-[12px] text-fg-subtle">
        {recording
          ? 'Recording. Use the page: each action its stores handle shows here, with what it changed and the code that dispatched it.'
          : "Record to see the actions of the page's stores (Redux, NgRx, Zustand, Pinia, Vuex) in every frame: what each changed, and where it was dispatched."}
      </p>
    );
  }
  return (
    <div ref={scroller} className="h-full overflow-y-auto" data-testid="stores-log">
      <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map((item) => (
          <div key={item.key} ref={virtual.measureElement} data-index={item.index} className="absolute inset-x-0" style={{ top: item.start }}>
            <ActionRow action={shown[item.index]!} resolve={resolve} />
          </div>
        ))}
      </div>
    </div>
  );
}
