import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { CANVAS_COLOR, PRELOAD_SCRIPT, TITLE_BAR_HEIGHT } from '../constants';
import { linuxTitleBar } from '../windows/linuxTitleBar';

/** The window's size when it first opens, and the smallest it can be made. */
const WINDOW_SIZE = { width: 1600, height: 1000 };
const MIN_WINDOW_SIZE = { width: 960, height: 600 };

/** The editor's window, hidden until its UI is ready to show. */
export function createEditorWindow(): BrowserWindow {
  return new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    title: 'Console Editor',
    // Elsewhere the window takes the app's own icon; on Linux it has to be given one.
    ...(process.platform === 'linux' ? { icon: appIcon } : {}),
    ...linuxTitleBar({ color: CANVAS_COLOR, height: TITLE_BAR_HEIGHT }),
    backgroundColor: CANVAS_COLOR,
    // The app menu keeps its shortcuts; on Windows/Linux Alt shows the bar.
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, PRELOAD_SCRIPT),
      contextIsolation: true,
      sandbox: true,
    },
  });
}
