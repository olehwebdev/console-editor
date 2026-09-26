import { api } from '@/shared/api';
import { getTabModel, markTabSaved, setTabSavedText, useTabStore } from '@/entities/editor-tab';
import { NO_SAVED_VERSION } from './constants';

/**
 * Brings the tab showing an override, if one does, up to its file after another editor changed it:
 * a tab without edits shows the new text as saved; one with edits keeps them, stays unsaved and says so.
 */
export async function syncEditedTab(overrideId: string): Promise<void> {
  if (!useTabStore.getState().tabs.some((t) => t.overrideId === overrideId)) return;
  let content: string;
  try {
    ({ content } = await api.getOverride(overrideId));
  } catch {
    // Deleted meanwhile: `overrides-changed` unlinks its tab.
    return;
  }
  // Looked up again: it may have closed, or been edited, while the text came.
  const tab = useTabStore.getState().tabs.find((t) => t.overrideId === overrideId);
  if (!tab) return;
  if (tab.dirty && getTabModel(tab.id)?.getValue() !== content) {
    markTabSaved(tab.id, NO_SAVED_VERSION);
    useTabStore.getState().patch(tab.id, { editedOutside: true });
    return;
  }
  setTabSavedText(tab.id, content);
  useTabStore.getState().patch(tab.id, { editedOutside: undefined });
}
