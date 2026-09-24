import type { ConsoleEntry } from '@common/types';
import { useConsoleStore } from '@/entities/console-log';
import { selectTopFrameId, useFrameStore } from '@/entities/frame';
import { useConsoleFilter } from './useConsoleFilter';

/**
 * Adds rows from the main process. When the top page loads another page, the
 * rows before it go, as in DevTools, unless Preserve log is on. (Frame changes
 * arrive before the rows that follow them, so the top frame is known.)
 */
export function receiveEntries(entries: readonly ConsoleEntry[]): void {
  const store = useConsoleStore.getState();
  const topId = selectTopFrameId(useFrameStore.getState());
  let lastLoad = -1;
  if (!useConsoleFilter.getState().preserveLog) {
    for (let i = entries.length - 1; i >= 0 && lastLoad === -1; i--) {
      if (entries[i]!.source === 'navigation' && entries[i]!.frameId === topId) lastLoad = i;
    }
  }
  if (lastLoad === -1) store.append(entries);
  else store.setAll(entries.slice(lastLoad));
}
