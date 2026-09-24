import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import type { AppEvent, MenuCommand } from '../shared/types';
import { REPO_URL } from './appInfo';
import type { PageController } from './PageController';
import type { OverrideStore } from './store/OverrideStore';

/** Where Help › Report an Issue leads. */
const ISSUES_URL = `${REPO_URL}/issues`;

/**
 * Replaces Electron's default menu. The default one binds Ctrl/Cmd+R to reloading
 * the *editor* window, which would throw away unsaved edits.
 */
export function installMenu(win: BrowserWindow, page: PageController, store: OverrideStore, send: (e: AppEvent) => void): void {
  const isMac = process.platform === 'darwin';
  const command = (c: MenuCommand) => () => send({ type: 'command', command: c });

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Save Override', accelerator: 'CmdOrCtrl+S', click: command('save') },
        { label: 'Format Document', accelerator: 'Shift+Alt+F', click: command('format') },
        { type: 'separator' },
        { label: 'Reveal Overrides Folder', click: () => void shell.openPath(store.filesDir) },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        // Undo/redo/select-all go to the renderer so Monaco handles them itself.
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: command('undo') },
        { label: 'Redo', accelerator: isMac ? 'Shift+Cmd+Z' : 'Ctrl+Y', click: command('redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: command('select-all') },
      ],
    },
    {
      label: 'View',
      submenu: [
        // In the menu so they also work while the page has focus (its keys never reach the editor).
        { label: 'Go to File or Command…', accelerator: 'CmdOrCtrl+K', click: command('toggle-palette') },
        { label: 'Go to File or Command…', accelerator: 'CmdOrCtrl+P', visible: false, acceleratorWorksWhenHidden: true, click: command('toggle-palette') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: command('toggle-sidebar') },
        { label: 'Focus Address Bar', accelerator: 'CmdOrCtrl+L', click: command('focus-url') },
        { label: 'Reload Page', accelerator: 'CmdOrCtrl+R', click: () => page.reload() },
        { label: 'Reload Page', accelerator: 'F5', visible: false, acceleratorWorksWhenHidden: true, click: () => page.reload() },
        { label: 'Toggle Diff', accelerator: 'CmdOrCtrl+Shift+D', click: command('toggle-diff') },
        { type: 'separator' },
        // Not F12 / Ctrl+Shift+I: Monaco uses those (go to definition / format on Linux).
        { label: 'Page DevTools', accelerator: 'CmdOrCtrl+Shift+J', click: () => page.openDevTools() },
        { label: 'Editor DevTools', accelerator: 'CmdOrCtrl+Alt+I', click: () => win.webContents.toggleDevTools() },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: "What's New", click: command('whats-new') },
        { label: 'Check for Updates…', click: command('check-updates') },
        { type: 'separator' },
        // On macOS "About" is in the app menu.
        ...(isMac ? [] : [{ role: 'about' } as MenuItemConstructorOptions]),
        { label: 'Report an Issue', click: () => void shell.openExternal(ISSUES_URL) },
        { label: 'Console Editor on GitHub', click: () => void shell.openExternal(REPO_URL) },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
