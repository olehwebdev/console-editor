import { create } from 'zustand';
import type { ActionRunStore } from './types';

/** How each action's last run went, for this run of the app. */
export const useActionRuns = create<ActionRunStore>()((set) => ({
  runs: {},
  setRun: (id, run) => set((s) => ({ runs: { ...s.runs, [id]: run } })),
}));
