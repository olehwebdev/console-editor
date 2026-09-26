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
  lastEdit: null,

  // Picking over leaves nothing under the pointer.
  setPicking: (picking) => set(picking ? { picking } : { picking, hover: null }),
  setHover: (hover) => set({ hover }),
  setComponent: (component) => set({ component }),
  setOrigins: (entries) =>
    set((s) => {
      const changed = entries.filter(([key, place]) => s.origins[key] !== place);
      return changed.length ? { origins: { ...s.origins, ...Object.fromEntries(changed) } } : s;
    }),
  setHookNames: (key, names) => set((s) => ({ hookNames: { ...s.hookNames, [key]: names } })),
  setLastEdit: (lastEdit) => set({ lastEdit }),
  forgetBundle: (bundleUrl) => {
    const { origins, hookNames } = get();
    const gone = new Set(Object.keys(origins).filter((key) => keyLocation(key)?.url === bundleUrl));
    const keep = <T>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([key]) => !gone.has(key)));
    set({ origins: keep(origins), hookNames: keep(hookNames) });
    return [...gone].flatMap((key) => keyLocation(key) ?? []);
  },
  forgetOrigins: () => set({ origins: {}, hookNames: {} }),
}));
