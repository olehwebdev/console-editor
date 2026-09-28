import { basename } from 'node:path';
import { copyFile } from 'node:fs/promises';
import { BrowserWindow, dialog, shell, type BrowserWindow as Window } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent, CaptureArea } from '../../shared/types';
import { captureInEveryBrowser, copyShotImage, importDesignFiles, type PageShots } from '../shots';
import type { DrivenBrowsers } from '../browsers';
import type { ShotStore } from '../store/ShotStore';
import { assertString } from './assertString';
import type { IpcHandle } from './types';

/** The files the design dialog offers. */
const DESIGN_FILES = { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] };

interface ShotIpcDeps {
  win: Window;
  shots: PageShots;
  store: ShotStore;
  driven: DrivenBrowsers;
  send(event: AppEvent): void;
}

/**
 * Captures and designs' channels. The shots menu is in both windows' toolbars (`handlePage`); capturing a picked
 * element is the Component page's, in the editor.
 */
export function registerShotIpc(handle: IpcHandle, handlePage: IpcHandle, { win, shots, store, driven, send }: ShotIpcDeps): void {
  handlePage(IPC_CHANNEL.listShots, () => shots.list());
  handlePage(IPC_CHANNEL.captureShot, (area: unknown) => shots.capture(area));
  handle(IPC_CHANNEL.captureElementShot, (pickId: unknown) => shots.captureElement(pickId));
  handlePage(IPC_CHANNEL.captureInEveryBrowser, () => captureInEveryBrowser(shots, driven));
  handlePage(IPC_CHANNEL.captureTabShot, async (browserId: unknown, tabId: unknown, area: unknown) => {
    assertString(browserId, 'browserId');
    assertString(tabId, 'tabId');
    const { image, url, browser } = await driven.capture(browserId, tabId, area);
    return shots.keep(image, url, area as CaptureArea, browser);
  });
  handlePage(IPC_CHANNEL.readShot, (id: unknown) => store.read(id));
  handlePage(IPC_CHANNEL.renameShot, (id: unknown, name: unknown) => shots.rename(id, name));
  handlePage(IPC_CHANNEL.deleteShot, (id: unknown) => shots.remove(id));
  handlePage(IPC_CHANNEL.showShotFile, (id: unknown) => shell.showItemInFolder(store.paths(id).image));
  handlePage(IPC_CHANNEL.copyShot, (id: unknown) => copyShotImage(store.paths(id).image));
  handlePage(IPC_CHANNEL.showShot, (id: unknown) => {
    assertString(id, 'id');
    store.get(id);
    if (win.isMinimized()) win.restore();
    win.focus();
    send({ type: 'show-shot', id });
  });
  handlePage(IPC_CHANNEL.importDesigns, async () => {
    const parent = BrowserWindow.getFocusedWindow() ?? win;
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, { title: 'Import designs', properties: ['openFile', 'multiSelections'], filters: [DESIGN_FILES] });
    return importDesignFiles(shots, canceled ? [] : filePaths);
  });
  handlePage(IPC_CHANNEL.addDesign, (name: unknown, bytes: unknown) => shots.addDesign(name, bytes));
  handle(IPC_CHANNEL.setShotScale, (id: unknown, scale: unknown) => shots.setScale(id, scale));
  handle(IPC_CHANNEL.captureForDesign, (designId: unknown) => shots.captureForDesign(designId));
  handlePage(IPC_CHANNEL.saveShotAs, async (id: unknown) => {
    assertString(id, 'id');
    const { name } = store.get(id);
    const { image } = store.paths(id);
    // The window the menu was used in, the editor's when that can't be told.
    const parent = BrowserWindow.getFocusedWindow() ?? win;
    const { canceled, filePath } = await dialog.showSaveDialog(parent, { title: 'Save a copy', defaultPath: name || basename(image) });
    if (canceled || !filePath) return null;
    await copyFile(image, filePath);
    return filePath;
  });
}
