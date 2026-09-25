import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { NetworkLog } from '../network';
import type { IpcHandle } from './types';

/** The Network panel's channels, for the editor UI. Rows themselves arrive as `network-requests` events. */
export function registerNetworkIpc(handle: IpcHandle, network: NetworkLog): void {
  handle(IPC_CHANNEL.listNetworkRequests, () => network.list());
  handle(IPC_CHANNEL.getNetworkRequest, (id: unknown) => network.detail(id));
  handle(IPC_CHANNEL.getNetworkResponseBody, (id: unknown) => network.responseBody(id));
  handle(IPC_CHANNEL.clearNetworkLog, () => network.clear());
}
