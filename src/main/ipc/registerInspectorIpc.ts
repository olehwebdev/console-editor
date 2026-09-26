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
  handle(IPC_CHANNEL.setComponentState, (pickId: unknown, depth: unknown, edit: unknown) => page.frames.inspector.setComponentState(pickId, depth, edit));
  handle(IPC_CHANNEL.highlightPick, (pickId: unknown) => page.frames.inspector.highlightPick(pickId));
  handle(IPC_CHANNEL.recordRenders, (on: unknown) => page.frames.inspector.recordRenders(on === true));
  handle(IPC_CHANNEL.isRecordingRenders, () => page.frames.inspector.recordingRenders);
  handle(IPC_CHANNEL.recordStores, (on: unknown) => page.frames.inspector.recordStores(on === true));
  handle(IPC_CHANNEL.isRecordingStores, () => page.frames.inspector.recordingStores);
  handle(IPC_CHANNEL.componentTree, (frameId: unknown, path: unknown) => page.frames.inspector.componentTree(frameId, path));
  handle(IPC_CHANNEL.openTreeNode, (frameId: unknown, path: unknown) => page.frames.inspector.openTreeNode(frameId, path));
  handle(IPC_CHANNEL.highlightTreeNode, (frameId: unknown, path: unknown) => page.frames.inspector.highlightTreeNode(frameId, path));
}
