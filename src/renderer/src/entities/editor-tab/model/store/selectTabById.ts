import type { TabStore } from './types';

export const selectTabById = (id: string) => (s: TabStore) => s.tabs.find((t) => t.id === id);
