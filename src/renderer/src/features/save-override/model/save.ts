import { api, errorMessage } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, markTabSaved, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

const inFlight = new Map<string, Promise<void>>();

/**
 * Saves a tab: creates the override on first save, updates it afterwards, then
 * reloads the page (when enabled). Concurrent saves of one tab are coalesced.
 * The content crosses IPC once; nothing is echoed back.
 */
export function saveTab(tabId: string | null = useTabStore.getState().activeId): Promise<void> {
  if (!tabId) return Promise.resolve();
  const running = inFlight.get(tabId);
  if (running) return running;
  const task = doSave(tabId).finally(() => inFlight.delete(tabId));
  inFlight.set(tabId, task);
  return task;
}

async function doSave(tabId: string): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  if (!tab || !model) return;
  if (tab.overrideId && !tab.dirty) return;

  const content = model.getValue();
  const version = model.getAlternativeVersionId();
  const { patch } = useTabStore.getState();
  patch(tabId, { saving: true });
  try {
    if (tab.overrideId) {
      useOverrideStore.getState().upsert(await api.updateOverride(tab.overrideId, { content }));
    } else {
      const base = getTabBase(tabId);
      const created = await api.createOverride({
        kind: tab.kind,
        sourceUrl: tab.url,
        content,
        // The base is only sent when it differs; unchanged it would be a second copy of a large file.
        ...(base !== undefined && base !== content ? { base } : {}),
        originalHash: tab.originalHash,
      });
      useOverrideStore.getState().upsert(created);
      patch(tabId, { overrideId: created.id });
    }
    markTabSaved(tabId, version);
    const reload = useSettingsStore.getState().settings.autoReloadOnSave;
    toast({ title: `Saved ${fileName(tab.url)}`, description: reload ? 'Reloading the page with your version.' : undefined, tone: 'success', duration: 2500 });
    if (reload) await api.reload();
  } catch (err) {
    toast({ title: `Could not save ${fileName(tab.url)}`, description: errorMessage(err), tone: 'danger' });
  } finally {
    patch(tabId, { saving: false });
  }
}
