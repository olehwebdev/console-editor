import { confirmState } from './confirmState';

/**
 * True while a confirm dialog is waiting for an answer. The dialog is modal, but
 * key listeners registered on `window` before it opened still run first, so
 * global hotkeys (palette, sidebar toggles…) should return early while this is true.
 */
export function isConfirmOpen(): boolean {
  return confirmState.queue.length > 0;
}
