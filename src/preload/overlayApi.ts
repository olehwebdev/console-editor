import { ipcRenderer } from 'electron';
import { IPC_CHANNEL } from '../shared/ipcChannels';
import type { OverlayApi } from '../shared/types';

/** The design overlay's part of the bridge. */
export const overlayApi: OverlayApi = {
  getOverlay: () => ipcRenderer.invoke(IPC_CHANNEL.getOverlay),
  showOverlay: (shotId) => ipcRenderer.invoke(IPC_CHANNEL.showOverlay, shotId),
  updateOverlay: (patch) => ipcRenderer.invoke(IPC_CHANNEL.updateOverlay, patch),
  removeOverlay: () => ipcRenderer.invoke(IPC_CHANNEL.removeOverlay),
};
