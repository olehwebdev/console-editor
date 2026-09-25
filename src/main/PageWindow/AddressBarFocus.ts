import type { BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';

/**
 * Brings the website window forward with its address bar focused. Its UI hears events only once it has
 * loaded and subscribed (it then asks for the page's state: `uiReady`); a request made before that waits.
 */
export class AddressBarFocus {
  private ready = false;
  private pending = false;

  constructor(private readonly win: BrowserWindow) {}

  request(): void {
    this.pending = true;
    if (this.ready) this.send();
  }

  /** The window's UI listens for events now. */
  uiReady(): void {
    this.ready = true;
    if (this.pending) this.send();
  }

  private send(): void {
    this.pending = false;
    const win = this.win;
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    win.webContents.send(IPC_CHANNEL.onEvent, { type: 'command', command: 'focus-url' } satisfies AppEvent);
  }
}
