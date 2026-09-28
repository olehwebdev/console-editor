import type { BrowserStore } from './types';

/** How many tabs of driven browsers are served the workspace's changes. */
export const selectDrivenTabCount = (s: BrowserStore): number => s.driven.reduce((sum, browser) => sum + browser.tabs.length, 0);
