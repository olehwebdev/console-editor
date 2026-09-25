import type { StoreLibrary } from '@common/types';

/** Actions the log draws, the newest; older ones stay kept until cleared. */
export const MAX_SHOWN = 200;
/** Digits an action's handling time is shown with (ms). */
export const DURATION_DIGITS = 1;
/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
export const NO_NAMES: Readonly<Record<string, string>> = {};
/** How each way of hearing a store is named, on its store's chip. */
export const LIBRARY_LABEL: Record<StoreLibrary, string> = {
  redux: 'Redux store',
  devtools: 'Store reporting to the Redux DevTools extension (NgRx, Zustand…)',
  pinia: 'Pinia store',
  vuex: 'Vuex store',
};
/** How tall an action's parts are before it is measured (px): its padding and border, its heading, each change. */
export const ACTION_FRAME_HEIGHT = 13;
export const ACTION_HEADING_HEIGHT = 24;
export const CHANGE_ROW_HEIGHT = 20;
/** Actions drawn beyond those in view, so scrolling doesn't show gaps. */
export const LOG_OVERSCAN = 5;
