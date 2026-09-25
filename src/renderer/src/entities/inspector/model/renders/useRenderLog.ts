import { create } from 'zustand';
import { MAX_COMMITS } from './constants';
import type { RenderLogStore } from './types';

/** The Renders log: whether commits are recorded, and those recorded (while it records or until cleared). */
export const useRenderLog = create<RenderLogStore>()((set) => ({
  recording: false,
  commits: [],

  setRecording: (recording) => set({ recording }),
  add: (commits) => set((s) => ({ commits: [...s.commits, ...commits].slice(-MAX_COMMITS) })),
  clear: () => set({ commits: [] }),
}));
