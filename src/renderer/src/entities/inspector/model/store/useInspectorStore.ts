import { create } from 'zustand';
import { keyLocation } from '../../lib/keyLocation';
import type { InspectorStore } from './types';

/** Picking an element in the page, and the component picked (mirrors the main process's inspector). */
export const useInspectorStore = create<InspectorStore>()((set, get) => ({
  picking: false,
  hover: null,
  component: null,
  origins: {},
  hookNames: {},

  // Picking over leaves nothing under the pointer.
  setPicking: (picking) => set(picking ? { picking } : { picking, hover: null }),
  setHover: (hover) => set({ hover }),
  setComponent: (component) => set({ component }),
  setOrigin: (key, place) => set((s) => ({ origins: { ...s.origins, [key]: place } })),
  setHookNames: (key, names) => set((s) => ({ hookNames: { ...s.hookNames, [key]: names } })),
  forgetBundle: (bundleUrl) => {
    const { origins, hookNames } = get();
    const gone = Object.keys(origins).filter((key) => keyLocation(key)?.url === bundleUrl);
    const keep = <T>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([key]) => !gone.includes(key)));
    set({ origins: keep(origins), hookNames: keep(hookNames) });
    return gone.flatMap((key) => keyLocation(key) ?? []);
  },
}));
