import type { BrowserWindow } from 'electron';
import { lockEditorNavigation } from '../launch/lockEditorNavigation';
import type { WindowHooks } from './types';

/**
 * Wires one of the app's own windows: closing it is handed to `closing` (which docks what it shows, or when the
 * app quits leaves it to go with the editor's window), its UI never navigates, its title stays the one main sets,
 * and it shows once its UI is ready.
 */
export function setUpWindow(win: BrowserWindow, { closing, maximized }: WindowHooks): void {
  win.on('close', (event) => {
    event.preventDefault();
    closing();
  });
  // The UI's own <title> would replace it.
  win.on('page-title-updated', (event) => event.preventDefault());
  lockEditorNavigation(win);
  win.once('ready-to-show', () => {
    if (maximized) win.maximize();
    win.show();
  });
}
