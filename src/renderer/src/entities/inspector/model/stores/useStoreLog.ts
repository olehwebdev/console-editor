import { create } from 'zustand';
import { MAX_ACTIONS } from './constants';
import type { StoreLogStore } from './types';

/** The Stores log: whether store actions are recorded, and those recorded (while it records or until cleared). */
export const useStoreLog = create<StoreLogStore>()((set) => ({
  recording: false,
  actions: [],

  setRecording: (recording) => set({ recording }),
  add: (actions) => set((s) => ({ actions: [...s.actions, ...actions].slice(-MAX_ACTIONS) })),
  clear: () => set({ actions: [] }),
}));
