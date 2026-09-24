import type { TabStore } from './types';

export const selectHasDirtyTabs = (s: TabStore) => s.tabs.some((t) => t.dirty);
