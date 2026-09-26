import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { setTabSavedText, useTabStore } from '@/entities/editor-tab';

/** Swaps a tab's unsaved edits for its override's file as another editor saved it; undo brings them back. */
export async function takeFileVersion(tabId: string): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab?.overrideId) return;
  try {
    const { content } = await api.getOverride(tab.overrideId);
    setTabSavedText(tabId, content);
    useTabStore.getState().patch(tabId, { editedOutside: undefined });
  } catch (err) {
    toast({ title: 'Could not read the file', description: errorMessage(err), tone: 'danger' });
  }
}
