import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { BrowserRegistry, DrivenBrowsers } from '../browsers';
import { listEverydayTabs } from '../browsers/everyday';
import { assertString } from './assertString';
import type { IpcHandle } from './types';

/** Where the dialog adding a browser opens, and which files it offers, per system. */
const ADD_BROWSER_DIALOG: Partial<Record<NodeJS.Platform, Pick<OpenDialogOptions, 'defaultPath' | 'filters'>>> = {
  darwin: { defaultPath: '/Applications', filters: [{ name: 'Applications', extensions: ['app'] }] },
  win32: { defaultPath: 'C:\\Program Files', filters: [{ name: 'Programs', extensions: ['exe'] }] },
  linux: { defaultPath: '/usr/bin' },
};

interface BrowserIpcDeps {
  win: BrowserWindow;
  browsers: BrowserRegistry;
  driven: DrivenBrowsers;
}

/**
 * The other browsers' channels. Listing and opening one, and the browsers driven with the workspace's changes, serve
 * the toolbar in both windows (`handlePage`); adding, removing and hiding one are Settings', in the editor.
 */
export function registerBrowserIpc(handle: IpcHandle, handlePage: IpcHandle, { win, browsers, driven }: BrowserIpcDeps): void {
  handlePage(IPC_CHANNEL.listBrowsers, () => browsers.list());
  handlePage(IPC_CHANNEL.openInBrowser, (id: unknown, url: unknown) => {
    assertString(id, 'id');
    assertString(url, 'url');
    return browsers.open(id, url);
  });
  handlePage(IPC_CHANNEL.openWithChanges, (id: unknown, url: unknown, everyday: unknown) => {
    assertString(id, 'id');
    assertString(url, 'url');
    return driven.open(id, url, everyday === true);
  });
  handlePage(IPC_CHANNEL.listDriven, () => driven.read());
  handlePage(IPC_CHANNEL.listEverydayTabs, () => listEverydayTabs());
  handlePage(IPC_CHANNEL.activateTab, (browserId: unknown, tabId: unknown) => {
    assertString(browserId, 'browserId');
    assertString(tabId, 'tabId');
    return driven.activate(browserId, tabId);
  });
  handlePage(IPC_CHANNEL.stopDriving, (browserId: unknown) => {
    assertString(browserId, 'browserId');
    driven.stop(browserId);
  });
  handle(IPC_CHANNEL.addBrowser, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Add a browser', properties: ['openFile'], ...ADD_BROWSER_DIALOG[process.platform] });
    return canceled || !filePaths[0] ? null : browsers.add(filePaths[0]);
  });
  handle(IPC_CHANNEL.removeBrowser, (id: unknown) => {
    assertString(id, 'id');
    return browsers.remove(id);
  });
  handle(IPC_CHANNEL.setBrowserHidden, (id: unknown, hidden: unknown) => {
    assertString(id, 'id');
    if (typeof hidden !== 'boolean') throw new Error('Invalid hidden');
    return browsers.setHidden(id, hidden);
  });
}
