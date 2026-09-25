import { disposeTabModel, PAGE_SCOPES, useTabStore } from '@/entities/editor-tab';
import { sessionSync } from './sessionSync';
import { stopSessionSync } from './stopSessionSync';

/**
 * Closes the file tabs as the workspace is left, keeping their drafts on disk
 * (flush first), and the workspace's pages (rule pages). App pages such as
 * What's New stay open.
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
  const closed = useTabStore.getState().tabs.map((t) => t.id);
  useTabStore.getState().removeTabs();
  useTabStore.getState().removePages(useTabStore.getState().pages.filter((p) => PAGE_SCOPES[p.page] === 'workspace').map((p) => p.id));
  // After React has moved the editor off their models.
  setTimeout(() => closed.forEach(disposeTabModel), 0);
}
