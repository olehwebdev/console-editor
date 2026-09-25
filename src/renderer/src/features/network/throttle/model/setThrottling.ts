import type { Throttling } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useSettingsStore } from '@/entities/settings';

/** Sets the network speed the page gets: shown at once, then saved and applied to every session. */
export async function setThrottling(throttling: Throttling): Promise<void> {
  const previous = useSettingsStore.getState().settings;
  useSettingsStore.getState().setSettings({ ...previous, throttling });
  try {
    useSettingsStore.getState().setSettings(await api.updateSettings({ throttling }));
  } catch (err) {
    useSettingsStore.getState().setSettings(previous);
    toast({ title: 'Could not change the network speed', description: errorMessage(err), tone: 'danger' });
  }
}
