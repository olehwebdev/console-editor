import { writeFile } from 'node:fs/promises';
import { app, dialog, type BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import { HAR_FILTERS, overridesFromHar, readHarFile } from '../har';
import type { PageController } from '../PageController';
import type { OverrideStore } from '../store/OverrideStore';
import { harFileName } from './harFileName';
import type { IpcHandle } from './types';

/** Exporting the Network panel's requests as a HAR file, and importing one as response overrides; each through a file dialog. */
export function registerHarIpc(handle: IpcHandle, { win, page, store }: { win: BrowserWindow; page: PageController; store: OverrideStore }): void {
  handle(IPC_CHANNEL.exportHar, async (ids: unknown) => {
    if (!Array.isArray(ids)) throw new Error('Pick the requests to export');
    const { canceled, filePath } = await dialog.showSaveDialog(win, { title: 'Export requests as HAR', defaultPath: harFileName(page.state().url), filters: HAR_FILTERS });
    if (canceled || !filePath) return null;
    const har = await page.network.har(ids.filter((id): id is string => typeof id === 'string'), app.getVersion());
    await writeFile(filePath, `${JSON.stringify(har, null, 2)}\n`);
    return filePath;
  });
  handle(IPC_CHANNEL.importHar, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Import a HAR as response overrides', filters: HAR_FILTERS, properties: ['openFile'] });
    if (canceled || !filePaths[0]) return null;
    const { overrides, skipped } = overridesFromHar(await readHarFile(filePaths[0]));
    for (const input of overrides) await store.create(input);
    if (overrides.length) await page.overridesChanged();
    return { created: overrides.length, skipped };
  });
}
