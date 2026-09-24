import { dismissEditorWidgets } from '@/shared/monaco';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { jobs } from './jobs';
import { startSave } from './startSave';

/**
 * Saves a tab: creates the override on first save, updates it afterwards, then
 * reloads the page (when enabled). Concurrent saves of one tab are coalesced:
 * saves requested while one runs share a single follow-up, which sends the
 * newer text if it changed. The content crosses IPC once; nothing is echoed back.
 */
export function saveTab(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  if (!tabId) return Promise.resolve();
  // An autocomplete list left open over the page would keep it frozen and hide the reload.
  dismissEditorWidgets();
  const job = jobs.get(tabId);
  if (!job) return startSave(tabId);
  job.next ??= job.task.then(() => (getTabModel(tabId)?.getAlternativeVersionId() === job.version ? undefined : startSave(tabId)));
  return job.next;
}
