import { Menu } from 'electron';
import { PAGE_WINDOW_MENU_ID } from './constants';

/** Keeps the View menu's "Website in Its Own Window" check mark on where the website is. */
export function syncMenuCheck(detached: boolean): void {
  const item = Menu.getApplicationMenu()?.getMenuItemById(PAGE_WINDOW_MENU_ID);
  if (item) item.checked = detached;
}
