import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { ActionsWindow } from '../ActionsWindow';
import type { IpcHandle } from './types';

/** Where the Actions panel is: `handle` is the editor's alone (only it can send the panel out), `handleEither` either window's. */
export function registerActionsWindowIpc(handle: IpcHandle, handleEither: IpcHandle, actionsWindow: ActionsWindow): void {
  handleEither(IPC_CHANNEL.getActionsWindow, () => actionsWindow.state());
  handle(IPC_CHANNEL.detachActions, () => actionsWindow.detach());
  handleEither(IPC_CHANNEL.attachActions, () => actionsWindow.attach());
  handleEither(IPC_CHANNEL.setActionsOnTop, (onTop: unknown) => actionsWindow.setOnTop(onTop));
}
