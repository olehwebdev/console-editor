import type { Settings } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useSettingsStore } from '@/entities/settings';

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const previous = useSettingsStore.getState().settings;
  useSettingsStore.getState().setSettings({ ...previous, [key]: value });
  try {
    useSettingsStore.getState().setSettings(await api.updateSettings({ [key]: value }));
  } catch (err) {
    useSettingsStore.getState().setSettings(previous);
    toast({ title: 'Could not change the setting', description: errorMessage(err), tone: 'danger' });
  }
}
