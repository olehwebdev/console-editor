import type { TabStore } from './types';

export const selectActivePage = (s: TabStore) => s.pages.find((p) => p.id === s.activeId) ?? null;
