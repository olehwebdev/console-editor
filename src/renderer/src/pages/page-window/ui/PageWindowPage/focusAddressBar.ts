import { addressBar } from './addressBar';

/** Focuses the window's address bar with its URL selected (Ctrl/Cmd+L while the website has its own window). */
export function focusAddressBar(): void {
  addressBar.current?.focus();
  addressBar.current?.select();
}
