import { create } from 'zustand';
import type { ResponseViews } from './types';

/** The root of a tree: open from the start. */
const ROOT: readonly string[] = [''];

/** Which response tabs show a tree, and what is open in each. Not kept between runs. */
export const useResponseViews = create<ResponseViews>()((set) => ({
  tree: {},
  open: {},

  toggle: (tabId) =>
    set((s) => {
      const { [tabId]: shown, ...rest } = s.tree;
      return { tree: shown ? rest : { ...rest, [tabId]: true }, open: s.open[tabId] ? s.open : { ...s.open, [tabId]: ROOT } };
    }),
  setOpen: (tabId, open) => set((s) => ({ open: { ...s.open, [tabId]: open } })),
}));
