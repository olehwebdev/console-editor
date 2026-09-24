import { api } from '@/shared/api';
import { useTabStore } from '@/entities/editor-tab';
import { activeFileId } from './activeFileId';
import { sessionSync } from './sessionSync';
import { toSessionTab } from './toSessionTab';
import { track } from './track';

export function saveTabs(): void {
  clearTimeout(sessionSync.tabsTimer);
  sessionSync.tabsTimer = undefined;
  const { syncing } = sessionSync;
  if (!syncing) return;
  const state = useTabStore.getState();
  track(
    api.saveSessionTabs(syncing, state.tabs.map(toSessionTab), activeFileId(state)).then(
      () => {
        sessionSync.tabsFailed = false;
      },
      (err: unknown) => {
        sessionSync.tabsFailed = true;
        throw err;
      },
    ),
  );
}
