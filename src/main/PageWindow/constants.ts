import { CANVAS_COLOR } from '../constants';
import type { TitleBarLook } from '../windows';

/** A new website window's size, before it is fitted to its screen. */
export const DEFAULT_WINDOW_SIZE = { width: 1280, height: 900 };

/** The smallest the website window can be made. */
export const MIN_WINDOW_SIZE = { width: 480, height: 360 };

/** The title while the page has none of its own (nothing loaded yet). */
export const UNTITLED = 'Website';

/** The View menu's item for the website window (its check mark follows where the website is). */
export const PAGE_WINDOW_MENU_ID = 'page-window';

/** Its top bar: the preview's toolbar (40 px, on the canvas) less the border at its foot. */
export const PAGE_WINDOW_TITLE_BAR: TitleBarLook = { color: CANVAS_COLOR, height: 39 };
