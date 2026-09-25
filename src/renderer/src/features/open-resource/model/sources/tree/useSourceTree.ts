import { create } from 'zustand';

export interface SourceTreeStore {
  /** Keys of nests and folders flipped from their default (bundle nests and Libraries closed, the rest open). */
  toggled: ReadonlySet<string>;
  /** A bundle row another view asked the Explorer to scroll to; `token` changes on every ask. */
  reveal: { bundleUrl: string; token: number } | null;
  toggle(key: string): void;
  setOpen(key: string, open: boolean, byDefault: boolean): void;
  requestScroll(bundleUrl: string): void;
  reset(): void;
}

/** Which originals the Explorer shows open. Kept here, not in the tree, so it survives the Explorer unmounting and other views can reveal a bundle. */
export const useSourceTree = create<SourceTreeStore>()((set) => ({
  toggled: new Set(),
  reveal: null,
  toggle: (key) =>
    set((s) => {
      const toggled = new Set(s.toggled);
      if (!toggled.delete(key)) toggled.add(key);
      return { toggled };
    }),
  setOpen: (key, open, byDefault) =>
    set((s) => {
      if (s.toggled.has(key) === (open !== byDefault)) return s;
      const toggled = new Set(s.toggled);
      if (open !== byDefault) toggled.add(key);
      else toggled.delete(key);
      return { toggled };
    }),
  requestScroll: (bundleUrl) => set((s) => ({ reveal: { bundleUrl, token: (s.reveal?.token ?? 0) + 1 } })),
  reset: () => set({ toggled: new Set(), reveal: null }),
}));
