import type { TabStore } from './types';

export const selectActiveSource = (s: TabStore) => s.sources.find((t) => t.id === s.activeId) ?? null;
