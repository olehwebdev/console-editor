/** An open menu: one of the popover's own (a field's choices), drawn outside it in a portal. */
const MENU_SELECTOR = '[role="menu"]';

/** Whether an event happened in an open menu. */
export function inMenu(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(MENU_SELECTOR);
}
