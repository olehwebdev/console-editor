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
