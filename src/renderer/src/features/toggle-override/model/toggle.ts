import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

/** Turns an override on or off (optimistically), then reloads the page when enabled in settings. */
export async function setOverrideEnabled(id: string, enabled: boolean): Promise<void> {
  const store = useOverrideStore.getState();
  const previous = store.byId[id];
  if (!previous) return;
  store.upsert({ ...previous, enabled });
  try {
    useOverrideStore.getState().upsert(await api.updateOverride(id, { enabled }));
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    useOverrideStore.getState().upsert(previous);
    toast({ title: `Could not ${enabled ? 'enable' : 'disable'} the override`, description: errorMessage(err), tone: 'danger' });
  }
}
