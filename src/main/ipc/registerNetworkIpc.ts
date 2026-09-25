import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { HeldAction } from '../../shared/types';
import type { NetworkLog } from '../network';
import type { IpcHandle } from './types';

/** The Network panel's channels, for the editor UI. Rows arrive as `network-requests` events, held requests as `held-requests`. */
export function registerNetworkIpc(handle: IpcHandle, network: NetworkLog): void {
  handle(IPC_CHANNEL.listNetworkRequests, () => network.list());
  handle(IPC_CHANNEL.getNetworkRequest, (id: unknown) => network.detail(id));
  handle(IPC_CHANNEL.getNetworkResponseBody, (id: unknown) => network.responseBody(id));
  handle(IPC_CHANNEL.clearNetworkLog, () => network.clear());
  handle(IPC_CHANNEL.listHeldRequests, () => network.held.list());
  // The action is checked there, as it arrives.
  handle(IPC_CHANNEL.resumeHeldRequest, (id: unknown, action: unknown) => network.held.resume(id, action as HeldAction));
}
