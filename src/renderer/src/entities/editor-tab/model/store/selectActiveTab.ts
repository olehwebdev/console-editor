import type { TabStore } from './types';

export const selectActiveTab = (s: TabStore) => s.tabs.find((t) => t.id === s.activeId) ?? null;
