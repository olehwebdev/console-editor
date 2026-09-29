import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { DesignOverlay } from '../overlay';
import type { IpcHandle } from './types';

/** The design overlay's channels, for both windows' UIs: its bar is under the preview's toolbar. */
export function registerOverlayIpc(handlePage: IpcHandle, overlay: DesignOverlay): void {
  handlePage(IPC_CHANNEL.getOverlay, () => overlay.get());
  handlePage(IPC_CHANNEL.showOverlay, (shotId: unknown) => overlay.show(shotId));
  handlePage(IPC_CHANNEL.updateOverlay, (patch: unknown) => overlay.update(patch));
  handlePage(IPC_CHANNEL.removeOverlay, () => overlay.remove());
}
