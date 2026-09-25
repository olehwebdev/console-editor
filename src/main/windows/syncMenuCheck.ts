import { Menu } from 'electron';

/** Keeps a View menu check mark (a window of the app's own, open or not) on the state it names. */
export function syncMenuCheck(id: string, checked: boolean): void {
  const item = Menu.getApplicationMenu()?.getMenuItemById(id);
  if (item) item.checked = checked;
}
