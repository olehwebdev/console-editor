import type { BaseWindow, BrowserWindow } from 'electron';
import type { AppEvent, MenuCommand } from '../../shared/types';

/**
 * A menu item's action that asks the editor's UI to run `command`. Pressed
 * while another window has focus (the website's own), it brings the editor
 * forward first, so what it does is seen.
 */
export function editorCommand(win: BrowserWindow, send: (e: AppEvent) => void, command: MenuCommand) {
  return (_item: unknown, focused: BaseWindow | undefined) => {
    if (focused && focused !== win && !win.isDestroyed()) win.focus();
    send({ type: 'command', command });
  };
}
