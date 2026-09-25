import { create } from 'zustand';
import type { NetworkFilter } from './types';

/** What the Network panel shows (the rows themselves are all kept, up to the log's limit). */
export const useNetworkFilter = create<NetworkFilter>()((set) => ({
  group: 'fetch',
  text: '',
  keepRows: false,

  setGroup: (group) => set((s) => (s.group === group ? s : { group })),
  setText: (text) => set({ text }),
  toggleKeepRows: () => set((s) => ({ keepRows: !s.keepRows })),
}));
