import { addressBar } from './addressBar';

/** Ref callback for the preview's address bar. */
export const setAddressBar = (el: HTMLInputElement | null) => {
  addressBar.current = el;
};
