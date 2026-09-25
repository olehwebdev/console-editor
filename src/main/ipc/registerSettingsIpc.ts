import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent, Settings } from '../../shared/types';
import type { PageController } from '../PageController';
import type { SettingsStore } from '../store/SettingsStore';
import type { UpdateService } from '../update/UpdateService';
import type { IpcHandle } from './types';

/** What changing a setting takes effect on. */
interface SettingsDeps {
  settings: SettingsStore;
  page: PageController;
  updates: UpdateService;
  send(event: AppEvent): void;
}

/** The settings' channels. `handle` also lets the Actions window turn the console's recording on; each change reaches every window. */
export function registerSettingsIpc(handle: IpcHandle, { settings, page, updates, send }: SettingsDeps): void {
  handle(IPC_CHANNEL.getSettings, () => settings.get());
  handle(IPC_CHANNEL.updateSettings, async (patch: Partial<Settings>) => {
    const next = await settings.update(patch);
    await page.settingsChanged();
    // Turning automatic checks on or off takes effect now.
    if (patch.checkForUpdates !== undefined) updates.schedule();
    send({ type: 'settings-changed', settings: next });
    return next;
  });
}
