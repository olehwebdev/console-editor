import { create } from 'zustand';
import type { NetworkSelection } from './types';

/** Which request the Network panel details, kept while the bottom pane shows the console instead. */
export const useNetworkSelection = create<NetworkSelection>()((set) => ({
  selectedId: null,
  tab: 'headers',

  select: (selectedId) => set((s) => (s.selectedId === selectedId ? s : { selectedId })),
  setTab: (tab) => set((s) => (s.tab === tab ? s : { tab })),
}));
