import { KEY } from '@/shared/config';
import type { PanelResizerOrientation, ResizerKeyHandler } from './types';

/** Home / End go to `min` / `max` when the size and that bound are known; Enter resets. */
const BOUND_AND_RESET_KEYS: Record<string, ResizerKeyHandler> = {
  [KEY.home]: (_event, { value, min, resize }) => {
    if (value !== undefined && min !== undefined) resize(min - value);
  },
  [KEY.end]: (_event, { value, max, resize }) => {
    if (value !== undefined && max !== undefined) resize(max - value);
  },
  [KEY.enter]: (event, { onReset }) => {
    if (!onReset) return;
    event.preventDefault();
    onReset();
  },
};

/** What each key does on the handle, by its orientation: the arrows along its axis step the size. */
export const RESIZER_KEY_HANDLERS: Record<PanelResizerOrientation, Record<string, ResizerKeyHandler>> = {
  vertical: {
    [KEY.arrowLeft]: (_event, { amount, resize }) => resize(-amount),
    [KEY.arrowRight]: (_event, { amount, resize }) => resize(amount),
    ...BOUND_AND_RESET_KEYS,
  },
  horizontal: {
    [KEY.arrowUp]: (_event, { amount, resize }) => resize(-amount),
    [KEY.arrowDown]: (_event, { amount, resize }) => resize(amount),
    ...BOUND_AND_RESET_KEYS,
  },
};
