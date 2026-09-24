import { api, errorMessage } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { disposeTabModel, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

/** Deletes an override after confirmation and closes its tabs. */
export async function deleteOverride(id: string): Promise<void> {
  const meta = useOverrideStore.getState().byId[id];
  if (!meta) return;
  const ok = await confirm({
    title: `Delete the override for ${fileName(meta.sourceUrl)}?`,
    body: 'The page goes back to the live file and your edits are lost.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  try {
    await api.deleteOverride(id);
    const tabs = useTabStore.getState();
    for (const tab of tabs.tabs.filter((t) => t.overrideId === id)) {
      tabs.remove(tab.id);
      setTimeout(() => disposeTabModel(tab.id), 0);
    }
    toast({ title: `Deleted the override for ${fileName(meta.sourceUrl)}`, tone: 'neutral', duration: 2500 });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not delete the override', description: errorMessage(err), tone: 'danger' });
  }
}
