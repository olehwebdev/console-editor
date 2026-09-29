import type { BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';

/** Hands an app window's UI an event it listens for (one of `heard`), while the window is open; the rest aren't its business. */
export function forwardEvent(win: BrowserWindow | undefined, heard: ReadonlySet<AppEvent['type']>, event: AppEvent): void {
  if (win && !win.isDestroyed() && heard.has(event.type)) win.webContents.send(IPC_CHANNEL.onEvent, event);
}
