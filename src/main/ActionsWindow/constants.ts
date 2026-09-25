import type { AppEvent } from '../../shared/types';
import { ACTIONS_WINDOW_EVENTS } from '../../shared/constants';

/** A new Actions window's size, before it is fitted to its screen: a tall list. */
export const ACTIONS_WINDOW_SIZE = { width: 420, height: 640 };

/** The smallest the Actions window can be made. */
export const MIN_ACTIONS_WINDOW_SIZE = { width: 320, height: 360 };

export const ACTIONS_WINDOW_TITLE = 'Actions';

/** The View menu's item for the Actions window (its check mark follows where the panel is). */
export const ACTIONS_WINDOW_MENU_ID = 'actions-window';

/** The events forwarded to the Actions window's UI. */
export const FORWARDED_EVENTS: ReadonlySet<AppEvent['type']> = new Set(ACTIONS_WINDOW_EVENTS);
