import { disposeTabModel, useTabStore } from '@/entities/editor-tab';
import { forgetSourceMaps } from '@/features/open-resource';
import { sessionSync } from './sessionSync';
import { stopSessionSync } from './stopSessionSync';

/**
 * Closes the file tabs as the workspace is left, keeping their drafts on disk
 * (flush first), and the originals opened from source maps, which are
 * forgotten with the maps. Pages such as What's New stay open.
 */
export function closeSessionTabs(): void {
  stopSessionSync();
  sessionSync.syncing = null;
  for (const timer of sessionSync.draftTimers.values()) clearTimeout(timer);
  sessionSync.draftTimers.clear();
  clearTimeout(sessionSync.tabsTimer);
  sessionSync.tabsTimer = undefined;
  sessionSync.drafted.clear();
  sessionSync.baseWritten.clear();
  sessionSync.failedDrafts.clear();
  sessionSync.tabsFailed = false;
  sessionSync.activeFile = null;
  const { tabs, sources } = useTabStore.getState();
  const closed = [...tabs, ...sources].map((t) => t.id);
  useTabStore.getState().removeTabs();
  forgetSourceMaps();
  // After React has moved the editor off their models.
  setTimeout(() => closed.forEach(disposeTabModel), 0);
}
