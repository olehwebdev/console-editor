import { create } from 'zustand';
import type { PanelTabStore } from './types';

/** Which of the panel's tabs is in front: the console, or the Renders log. */
export const usePanelTab = create<PanelTabStore>()((set) => ({
  tab: 'console',
  show: (tab) => set({ tab }),
}));
