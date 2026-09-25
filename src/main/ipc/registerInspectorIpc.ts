import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { PageController } from '../PageController';
import type { IpcHandle } from './types';

/** The inspector's channels, the editor's alone. */
export function registerInspectorIpc(handle: IpcHandle, page: PageController): void {
  handle(IPC_CHANNEL.listStacks, () => page.frames.inspector.list());
  handle(IPC_CHANNEL.scanStacks, () => page.frames.inspector.scan());
  handle(IPC_CHANNEL.startPicking, () => page.frames.inspector.startPicking());
  handle(IPC_CHANNEL.stopPicking, () => page.frames.inspector.stopPicking());
  handle(IPC_CHANNEL.inspectComponent, (pickId: unknown, depth: unknown) => page.frames.inspector.inspectComponent(pickId, depth));
  handle(IPC_CHANNEL.highlightPick, (pickId: unknown) => page.frames.inspector.highlightPick(pickId));
}
