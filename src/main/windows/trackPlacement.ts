import type { BrowserWindow } from 'electron';
import type { WindowStore } from '../store/WindowStore';
import { BOUNDS_SAVE_DELAY_MS } from './constants';

/** Saves the window's bounds a moment after it stops moving or resizing. Returns what saves them at once. */
export function trackPlacement(win: BrowserWindow, store: WindowStore): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    if (!win.isDestroyed()) void store.update({ bounds: win.getNormalBounds(), maximized: win.isMaximized() });
  };
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(save, BOUNDS_SAVE_DELAY_MS);
  };
  win.on('move', later);
  win.on('resize', later);
  win.on('maximize', later);
  win.on('unmaximize', later);
  win.once('closed', () => clearTimeout(timer));
  return save;
}
