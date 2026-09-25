import { create } from 'zustand';

interface FilterStore {
  query: string;
  setQuery(query: string): void;
}

/** The sidebar filter: matches file URLs and the iframes and workers that loaded them. */
export const useResourceFilter = create<FilterStore>()((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));
