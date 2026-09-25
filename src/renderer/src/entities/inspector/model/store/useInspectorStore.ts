import { create } from 'zustand';
import type { InspectorStore } from './types';

/** Picking an element in the page, and the component picked (mirrors the main process's inspector). */
export const useInspectorStore = create<InspectorStore>()((set) => ({
  picking: false,
  hover: null,
  component: null,
  origins: {},

  // Picking over leaves nothing under the pointer.
  setPicking: (picking) => set(picking ? { picking } : { picking, hover: null }),
  setHover: (hover) => set({ hover }),
  setComponent: (component) => set({ component }),
  setOrigin: (key, place) => set((s) => ({ origins: { ...s.origins, [key]: place } })),
}));
