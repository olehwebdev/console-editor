import type { BrowserWindow } from 'electron';

/** The editor UI must never navigate away or open windows. */
export function lockEditorNavigation(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
}
