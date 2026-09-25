import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { PageController } from '../PageController';
import type { IpcHandle } from './types';

/** The console's channels: `handle` is the editor's alone, `handleEither` also the Actions window's (it lists frames and runs code). */
export function registerConsoleIpc(handle: IpcHandle, handleEither: IpcHandle, page: PageController): void {
  handleEither(IPC_CHANNEL.listFrames, () => page.console.listFrames());
  handle(IPC_CHANNEL.getConsoleEntries, () => page.console.listEntries());
  handleEither(IPC_CHANNEL.evaluateInFrame, (frameId: unknown, code: unknown) => page.console.evaluate(frameId, code));
  handleEither(IPC_CHANNEL.getConsoleProperties, (handle: unknown) => page.console.properties(handle));
  handle(IPC_CHANNEL.clearConsole, () => page.console.clear());
}
