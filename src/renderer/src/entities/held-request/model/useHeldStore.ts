import { create } from 'zustand';
import type { HeldStore } from './types';

/** The requests breakpoints hold, waiting for what to do with them. */
export const useHeldStore = create<HeldStore>()((set) => ({
  held: [],
  setAll: (held) => set({ held }),
}));
