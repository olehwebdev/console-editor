import { create } from 'zustand';
import type { HeldDraftStore } from './types';

/** The edits made to each held request's URL, method, status and headers, until it is let go. */
export const useHeldDrafts = create<HeldDraftStore>()((set) => ({
  drafts: {},
  set: (id, draft) => set((s) => ({ drafts: { ...s.drafts, [id]: draft } })),
  patch: (id, patch) =>
    set((s) => {
      const draft = s.drafts[id];
      return draft ? { drafts: { ...s.drafts, [id]: { ...draft, ...patch } } } : s;
    }),
  drop: (id) =>
    set((s) => {
      if (!(id in s.drafts)) return s;
      const { [id]: _dropped, ...drafts } = s.drafts;
      return { drafts };
    }),
}));
