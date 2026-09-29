import type { BrowserInfo } from '@common/types';
import type { BrowserStore } from './types';

/** The browsers offered beside the address bar: the ones not turned off. Select with `useShallow`. */
export const selectShownBrowsers = (s: BrowserStore): BrowserInfo[] => s.browsers.filter((b) => !b.hidden);
