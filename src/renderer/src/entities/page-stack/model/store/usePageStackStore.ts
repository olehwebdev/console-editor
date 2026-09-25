import { create } from 'zustand';
import type { PageStackStore } from './types';

/** What the page's frames run, as the main process last found it. */
export const usePageStackStore = create<PageStackStore>()((set) => ({
  stacks: [],

  setAll: (stacks) => set({ stacks }),
}));
