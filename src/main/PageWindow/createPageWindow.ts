import { BrowserWindow, type Rectangle } from 'electron';
import { join } from 'node:path';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { CANVAS_COLOR, PRELOAD_SCRIPT } from '../constants';
import { MIN_WINDOW_SIZE, UNTITLED } from './constants';

/**
 * The website's own window, at `bounds`, hidden until its UI is ready. No parent: a child window would
 * follow the editor (moving with it on macOS, staying above it on Windows), and this one goes to another screen.
 */
export function createPageWindow(bounds: Rectangle): BrowserWindow {
  return new BrowserWindow({
    ...bounds,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    title: UNTITLED,
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
