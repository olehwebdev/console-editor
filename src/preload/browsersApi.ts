import { ipcRenderer } from 'electron';
import { IPC_CHANNEL } from '../shared/ipcChannels';
import type { BrowsersApi } from '../shared/types';

/** The other browsers' part of the bridge. */
export const browsersApi: BrowsersApi = {
  listBrowsers: () => ipcRenderer.invoke(IPC_CHANNEL.listBrowsers),
  openInBrowser: (id, url) => ipcRenderer.invoke(IPC_CHANNEL.openInBrowser, id, url),
  addBrowser: () => ipcRenderer.invoke(IPC_CHANNEL.addBrowser),
  removeBrowser: (id) => ipcRenderer.invoke(IPC_CHANNEL.removeBrowser, id),
  setBrowserHidden: (id, hidden) => ipcRenderer.invoke(IPC_CHANNEL.setBrowserHidden, id, hidden),
  openWithChanges: (id, url, everyday) => ipcRenderer.invoke(IPC_CHANNEL.openWithChanges, id, url, everyday === true),
  listDriven: () => ipcRenderer.invoke(IPC_CHANNEL.listDriven),
  activateTab: (browserId, tabId) => ipcRenderer.invoke(IPC_CHANNEL.activateTab, browserId, tabId),
  stopDriving: (browserId) => ipcRenderer.invoke(IPC_CHANNEL.stopDriving, browserId),
  listEverydayTabs: () => ipcRenderer.invoke(IPC_CHANNEL.listEverydayTabs),
};
