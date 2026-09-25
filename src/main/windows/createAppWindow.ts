import { BrowserWindow, type Rectangle } from 'electron';
import { join } from 'node:path';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { CANVAS_COLOR, PRELOAD_SCRIPT } from '../constants';
import type { AppWindowOptions } from './types';

/**
 * One of the app's own windows besides the editor's (the website's, the Actions panel's), at `bounds`, hidden
 * until its UI is ready. No parent: a child window would follow the editor (moving with it on macOS, staying
 * above it on Windows), and these go to another screen.
 */
export function createAppWindow(bounds: Rectangle, { title, minSize }: AppWindowOptions): BrowserWindow {
  return new BrowserWindow({
    ...bounds,
    minWidth: minSize.width,
    minHeight: minSize.height,
    title,
    ...(process.platform === 'linux' ? { icon: appIcon } : {}),
    backgroundColor: CANVAS_COLOR,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, PRELOAD_SCRIPT),
      contextIsolation: true,
      sandbox: true,
    },
  });
}
