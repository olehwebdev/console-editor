import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { PageController } from '../PageController';
import type { IpcHandle } from './types';

/** The inspector's channels, the editor's alone. */
export function registerInspectorIpc(handle: IpcHandle, page: PageController): void {
  handle(IPC_CHANNEL.listStacks, () => page.frames.inspector.list());
  handle(IPC_CHANNEL.scanStacks, () => page.frames.inspector.scan());
}
