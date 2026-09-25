import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';
import type { ActionStore } from '../store/ActionStore';
import type { IpcHandle } from './types';

/** The actions' channels, for the editor UI. The store checks what they are given; 'actions-changed' is sent before each change's reply resolves. */
export function registerActionIpc(handle: IpcHandle, actions: ActionStore, send: (event: AppEvent) => void): void {
  // Every change is announced, so whatever shows the actions shows them as they are.
  const changed = <T>(result: T): T => {
    send({ type: 'actions-changed', actions: actions.list() });
    return result;
  };
  handle(IPC_CHANNEL.listActions, () => actions.list());
  handle(IPC_CHANNEL.createAction, async (input: unknown) => changed(await actions.create(input)));
  handle(IPC_CHANNEL.updateAction, async (id: unknown, patch: unknown) => changed(await actions.update(id, patch)));
  handle(IPC_CHANNEL.deleteAction, async (id: unknown) => changed(await actions.remove(id)));
}
