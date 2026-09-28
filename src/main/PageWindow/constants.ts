import { PAGE_WINDOW_EVENTS } from '../../shared/constants';
import type { AppEvent } from '../../shared/types';

/** A new website window's size, before it is fitted to its screen. */
export const DEFAULT_WINDOW_SIZE = { width: 1280, height: 900 };

/** The smallest the website window can be made. */
export const MIN_WINDOW_SIZE = { width: 480, height: 360 };

/** The title while the page has none of its own (nothing loaded yet). */
export const UNTITLED = 'Website';

/** The View menu's item for the website window (its check mark follows where the website is). */
export const PAGE_WINDOW_MENU_ID = 'page-window';

/** The events the website window's UI hears besides its page's state and its shortcut (which go out on their own). */
export const FORWARDED_EVENTS: ReadonlySet<AppEvent['type']> = new Set(PAGE_WINDOW_EVENTS);
