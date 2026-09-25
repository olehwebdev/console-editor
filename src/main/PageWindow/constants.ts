/** A new website window's size, before it is fitted to its screen. */
export const DEFAULT_WINDOW_SIZE = { width: 1280, height: 900 };

/** The smallest the website window can be made. */
export const MIN_WINDOW_SIZE = { width: 480, height: 360 };

/** The most of its screen's work area a new website window takes. */
export const MAX_SCREEN_SHARE = 0.9;

/** How much of a saved window must be on some screen, each way, for it to open there again. */
export const MIN_VISIBLE_PX = 80;

/** How long the window must stay put before its bounds are saved (moves and resizes come in bursts). */
export const BOUNDS_SAVE_DELAY_MS = 500;

/** The title while the page has none of its own (nothing loaded yet). */
export const UNTITLED = 'Website';

/** The View menu's item for the website window (its check mark follows where the website is). */
export const PAGE_WINDOW_MENU_ID = 'page-window';
