import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { getTabBase, getTabModel, markTabSaved, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

export async function doSave(tabId: string): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  // A held request's tab is sent, never saved (Save as override makes its override).
  if (!tab || !model || tab.held) return;
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
        // A response tab's method, operation, status… become its override's.
        ...(tab.request ? { request: tab.request } : {}),
        ...(tab.response ? { response: tab.response } : {}),
      });
      useOverrideStore.getState().upsert(created);
      patch(tabId, { overrideId: created.id, request: undefined, response: undefined });
    }
    markTabSaved(tabId, version);
    const reload = useSettingsStore.getState().settings.autoReloadOnSave;
    toast({ title: `Saved ${fileName(tab.url)}`, description: reload ? 'Reloading the page with your version.' : undefined, tone: 'success', duration: TOAST_DURATION.confirm });
    if (reload) await api.reload();
  } catch (err) {
    toast({ title: `Could not save ${fileName(tab.url)}`, description: errorMessage(err), tone: 'danger' });
  } finally {
    patch(tabId, { saving: false });
  }
}
