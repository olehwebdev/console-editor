import { ipcRenderer } from 'electron';
import { IPC_CHANNEL } from '../shared/ipcChannels';
import type { ShotsApi } from '../shared/types';

/** Captures and designs' part of the bridge. */
export const shotsApi: ShotsApi = {
  listShots: () => ipcRenderer.invoke(IPC_CHANNEL.listShots),
  captureShot: (area) => ipcRenderer.invoke(IPC_CHANNEL.captureShot, area),
  captureElementShot: (pickId) => ipcRenderer.invoke(IPC_CHANNEL.captureElementShot, pickId),
  captureTabShot: (browserId, tabId, area) => ipcRenderer.invoke(IPC_CHANNEL.captureTabShot, browserId, tabId, area),
  captureInEveryBrowser: () => ipcRenderer.invoke(IPC_CHANNEL.captureInEveryBrowser),
  readShot: (id) => ipcRenderer.invoke(IPC_CHANNEL.readShot, id),
  renameShot: (id, name) => ipcRenderer.invoke(IPC_CHANNEL.renameShot, id, name),
  deleteShot: (id) => ipcRenderer.invoke(IPC_CHANNEL.deleteShot, id),
  showShotFile: (id) => ipcRenderer.invoke(IPC_CHANNEL.showShotFile, id),
  saveShotAs: (id) => ipcRenderer.invoke(IPC_CHANNEL.saveShotAs, id),
  copyShot: (id) => ipcRenderer.invoke(IPC_CHANNEL.copyShot, id),
  showShot: (id) => ipcRenderer.invoke(IPC_CHANNEL.showShot, id),
  importDesigns: () => ipcRenderer.invoke(IPC_CHANNEL.importDesigns),
  addDesign: (name, bytes) => ipcRenderer.invoke(IPC_CHANNEL.addDesign, name, bytes),
  setShotScale: (id, scale) => ipcRenderer.invoke(IPC_CHANNEL.setShotScale, id, scale),
  captureForDesign: (designId) => ipcRenderer.invoke(IPC_CHANNEL.captureForDesign, designId),
};
