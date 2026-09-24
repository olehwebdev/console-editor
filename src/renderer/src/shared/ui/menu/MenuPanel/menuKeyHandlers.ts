// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { KEY } from '@/shared/config';
import type { MenuKeyHandler } from './types';

/** What each key does in an open menu; other printable keys run the typeahead. */
export const MENU_KEY_HANDLERS: Record<string, MenuKeyHandler> = {
  [KEY.arrowDown]: (event, menu) => {
    event.preventDefault();
    menu.move(1);
  },
  [KEY.arrowUp]: (event, menu) => {
    event.preventDefault();
    menu.move(-1);
  },
  [KEY.home]: (event, { enabled, setActive }) => {
    event.preventDefault();
    setActive(enabled[0] ?? -1);
  },
  [KEY.end]: (event, { enabled, setActive }) => {
    event.preventDefault();
    setActive(enabled[enabled.length - 1] ?? -1);
  },
  [KEY.escape]: (event, menu) => {
    event.preventDefault();
    event.stopPropagation();
    menu.onClose('escape');
  },
  // Focus returns to the owner first, so the browser's Tab continues from there.
  [KEY.tab]: (_event, menu) => menu.onClose('tab'),
  [KEY.enter]: (event, menu) => {
    event.preventDefault();
    menu.chooseActive();
  },
  [KEY.space]: (event, menu) => {
    event.preventDefault();
    if (menu.typing) menu.runTypeahead(KEY.space);
    else menu.chooseActive();
  },
};
