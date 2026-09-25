import { create } from 'zustand';
import { MAX_NETWORK_REQUESTS } from '@common/constants';
import type { NetworkStore } from './types';

/** The page's requests (mirrors the main process's log, which sends new and changed rows in batches). */
export const useNetworkStore = create<NetworkStore>()((set) => ({
  requests: [],

  upsert: (requests) =>
    set((s) => {
      if (!requests.length) return s;
      const index = new Map(s.requests.map((r, i) => [r.id, i]));
      const next = [...s.requests];
      for (const request of requests) {
        const at = index.get(request.id);
        if (at === undefined) {
          index.set(request.id, next.length);
          next.push(request);
        } else {
          next[at] = request;
        }
      }
      return { requests: next.length > MAX_NETWORK_REQUESTS ? next.slice(-MAX_NETWORK_REQUESTS) : next };
    }),
  setAll: (requests) => set({ requests: requests.slice(-MAX_NETWORK_REQUESTS) }),
  dropBefore: (pageLoad) =>
    set((s) => {
      const kept = s.requests.filter((r) => r.pageLoad >= pageLoad);
      return kept.length === s.requests.length ? s : { requests: kept };
    }),
  clear: () => set((s) => (s.requests.length ? { requests: [] } : s)),
}));
