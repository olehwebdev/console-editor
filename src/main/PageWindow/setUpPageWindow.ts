import type { BrowserWindow } from 'electron';
import { lockEditorNavigation } from '../launch/lockEditorNavigation';
import type { PageWindowHooks } from './types';

/**
 * Wires the website window: closing it is handed to `closing` (which puts the website back, or when the app
 * quits leaves it to go with the editor's window), its UI never navigates, its title stays the page's, and it
 * shows once its UI is ready.
 */
export function setUpPageWindow(win: BrowserWindow, { closing, maximized }: PageWindowHooks): void {
  win.on('close', (event) => {
    event.preventDefault();
    closing();
  });
  // The UI's own <title> would replace the page's.
  win.on('page-title-updated', (event) => event.preventDefault());
  lockEditorNavigation(win);
  win.once('ready-to-show', () => {
    if (maximized) win.maximize();
    win.show();
  });
}
