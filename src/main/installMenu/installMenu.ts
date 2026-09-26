import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { SHORTCUT } from '../../shared/constants';
import type { AppEvent, MenuCommand } from '../../shared/types';
import { ACTIONS_WINDOW_MENU_ID, type ActionsWindow } from '../ActionsWindow';
import { REPO_URL } from '../appInfo';
import { PICK_MENU_ID } from '../inspector';
import type { PageController } from '../PageController';
import { PAGE_WINDOW_MENU_ID } from '../PageWindow';
import type { OverrideStore } from '../store/OverrideStore';
import { toAccelerator } from '../toAccelerator';
import { ISSUES_URL } from './constants';
import { editCommand } from './editCommand';
import { editorCommand } from './editorCommand';

/**
 * Replaces Electron's default menu. The default one binds Ctrl/Cmd+R to reloading
 * the *editor* window, which would throw away unsaved edits.
 */
export function installMenu(win: BrowserWindow, page: PageController, store: OverrideStore, actionsWindow: ActionsWindow, send: (e: AppEvent) => void): void {
  const isMac = process.platform === 'darwin';
  const command = (c: MenuCommand) => editorCommand(win, send, c);
  const { window: pageWindow } = page;

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Save', accelerator: toAccelerator(SHORTCUT.save), click: command('save') },
        { label: 'Format Document', accelerator: toAccelerator(SHORTCUT.format), click: command('format') },
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
        { label: 'Undo', accelerator: toAccelerator(SHORTCUT.undo), click: editCommand(win, send, 'undo') },
        { label: 'Redo', accelerator: toAccelerator(isMac ? SHORTCUT.redo : SHORTCUT.redoCtrlY), click: editCommand(win, send, 'redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { label: 'Select All', accelerator: toAccelerator(SHORTCUT.selectAll), click: editCommand(win, send, 'select-all') },
      ],
    },
    {
      label: 'View',
      submenu: [
        // In the menu so they also work while the page has focus (its keys never reach the editor).
        { label: 'Go to File or Command…', accelerator: toAccelerator(SHORTCUT.palette), click: command('toggle-palette') },
        { label: 'Go to File or Command…', accelerator: toAccelerator(SHORTCUT.quickOpen), visible: false, acceleratorWorksWhenHidden: true, click: command('toggle-palette') },
        { label: 'Toggle Sidebar', accelerator: toAccelerator(SHORTCUT.sidebar), click: command('toggle-sidebar') },
        { label: 'Toggle Console', accelerator: toAccelerator(SHORTCUT.console), click: command('toggle-console') },
        {
          label: 'Focus Address Bar',
          accelerator: toAccelerator(SHORTCUT.focusUrl),
          // The address bar goes with the website into its own window.
          click: (item, focused) => (pageWindow.detached ? pageWindow.focusAddressBar() : command('focus-url')(item, focused)),
        },
        { label: 'Reload Page', accelerator: toAccelerator(SHORTCUT.reload), click: () => void page.reload() },
        { label: 'Reload Page', accelerator: toAccelerator(SHORTCUT.reloadF5), visible: false, acceleratorWorksWhenHidden: true, click: () => void page.reload() },
        { label: 'Toggle Diff', accelerator: toAccelerator(SHORTCUT.diff), click: command('toggle-diff') },
        { label: 'Go to Original Source or Bundle Code', accelerator: toAccelerator(SHORTCUT.jumpToMapped), click: command('jump-to-mapped') },
        {
          id: PAGE_WINDOW_MENU_ID,
          label: 'Website in Its Own Window',
          type: 'checkbox',
          checked: pageWindow.detached,
          click: () => (pageWindow.detached ? pageWindow.attach() : void pageWindow.detach()),
        },
        {
          id: ACTIONS_WINDOW_MENU_ID,
          label: 'Actions in Their Own Window',
          type: 'checkbox',
          checked: actionsWindow.detached,
          click: () => (actionsWindow.detached ? actionsWindow.attach() : void actionsWindow.detach()),
        },
        { type: 'separator' },
        // Not F12 / Ctrl+Shift+I: Monaco uses those (go to definition / format on Linux).
        { label: 'Page DevTools', accelerator: toAccelerator(SHORTCUT.pageDevTools), click: () => page.openDevTools() },
        { id: PICK_MENU_ID, label: 'Pick an Element', accelerator: toAccelerator(SHORTCUT.pickElement), click: () => void page.frames.inspector.togglePicking() },
        { label: 'Editor DevTools', accelerator: toAccelerator(SHORTCUT.editorDevTools), click: () => win.webContents.toggleDevTools() },
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
