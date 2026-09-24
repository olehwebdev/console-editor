import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
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
  // Taken before the call: its `overrides-changed` event arrives before the reply and unlinks these tabs.
  const tabIds = useTabStore
    .getState()
    .tabs.filter((t) => t.overrideId === id)
    .map((t) => t.id);
  try {
    await api.deleteOverride(id);
    const tabs = useTabStore.getState();
    // Skip a tab saved as a new override in the meantime.
    for (const tab of tabs.tabs.filter((t) => tabIds.includes(t.id) && (t.overrideId === undefined || t.overrideId === id))) {
      tabs.remove(tab.id);
      setTimeout(() => disposeTabModel(tab.id), 0);
    }
    toast({ title: `Deleted the override for ${fileName(meta.sourceUrl)}`, tone: 'neutral', duration: TOAST_DURATION.confirm });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not delete the override', description: errorMessage(err), tone: 'danger' });
  }
}
