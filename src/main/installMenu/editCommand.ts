import { webContents, type BrowserWindow } from 'electron';
import type { AppEvent } from '../../shared/types';
import { EDIT_ACTIONS } from './constants';
import type { EditCommand } from './types';

/**
 * A menu item's action for undo, redo or select all. In the editor's UI, the
 * UI runs it (so Monaco handles it itself); anywhere else (the site, the
 * website window's address bar) it acts on what has focus.
 */
export function editCommand(win: BrowserWindow, send: (e: AppEvent) => void, command: EditCommand) {
  return () => {
    const focused = webContents.getFocusedWebContents();
    if (focused && focused !== win.webContents) EDIT_ACTIONS[command](focused);
    else send({ type: 'command', command });
  };
}
