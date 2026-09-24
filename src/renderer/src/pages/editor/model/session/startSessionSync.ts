import { onTabEdited, useTabStore, type TabMeta } from '@/entities/editor-tab';
import { useWorkspaceStore } from '@/entities/workspace';
import { activeFileId } from './activeFileId';
import { dropDraft } from './dropDraft';
import { saveDraft } from './saveDraft';
import { saveTabs } from './saveTabs';
import { sessionSync } from './sessionSync';
import { stopSessionSync } from './stopSessionSync';

const TABS_DELAY_MS = 300;
/** Drafts can be megabytes: written once typing pauses, and always on close. */
const DRAFT_DELAY_MS = 800;

/**
 * Keeps the active workspace's session on disk in step with the tabs. Start it
 * after `restoreSession`, so the empty tab list of a fresh start never
 * overwrites the one being restored. Returns `stopSessionSync`.
 */
export function startSessionSync(): () => void {
  stopSessionSync();
  const workspaceId = useWorkspaceStore.getState().activeId;
  if (!workspaceId) return stopSessionSync;
  sessionSync.syncing = workspaceId;
  const key = (tabs: TabMeta[], activeId: string | null) =>
    JSON.stringify([tabs.map((t) => [t.id, t.url, t.kind, t.overrideId, t.originalHash]), activeId]);
  let last = key(useTabStore.getState().tabs, activeFileId(useTabStore.getState()));

  const offTabs = useTabStore.subscribe((s) => {
    // Saved, undone back to the saved text, or closed: the draft is obsolete.
    for (const id of sessionSync.drafted) {
      const tab = s.tabs.find((t) => t.id === id);
      if (!tab?.dirty) dropDraft(id);
    }
    const next = key(s.tabs, activeFileId(s));
    if (next === last) return;
    last = next;
    clearTimeout(sessionSync.tabsTimer);
    sessionSync.tabsTimer = setTimeout(saveTabs, TABS_DELAY_MS);
  });

  const offEdits = onTabEdited((tabId) => {
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (!tab?.dirty) return;
    clearTimeout(sessionSync.draftTimers.get(tabId));
    sessionSync.draftTimers.set(tabId, setTimeout(() => saveDraft(tabId), DRAFT_DELAY_MS));
  });

  sessionSync.unsubscribe = () => {
    offTabs();
    offEdits();
  };
  return stopSessionSync;
}
