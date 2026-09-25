import { addressBar } from './addressBar';

/** Ref callback for the window's address bar. */
export const setAddressBar = (el: HTMLInputElement | null) => {
  addressBar.current = el;
};
