import type { BrowserWindowConstructorOptions } from 'electron';
import { TITLE_BAR_SYMBOL_COLOR } from '../constants';
import type { TitleBarLook } from './types';

/**
 * On Linux the system's title bar (a light bar naming the app, above the window's own UI) gives way to the
 * window's own top bar, with the window buttons drawn over its right end in its colours. Elsewhere, nothing.
 */
export function linuxTitleBar({ color, height }: TitleBarLook): BrowserWindowConstructorOptions {
  if (process.platform !== 'linux') return {};
  return { titleBarStyle: 'hidden', titleBarOverlay: { color, symbolColor: TITLE_BAR_SYMBOL_COLOR, height } };
}
