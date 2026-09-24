import { create } from 'zustand';
import type { ResourceEntry } from '@common/types';

/**
 * Files the page loaded, keyed per reporting session: a cross-site iframe's
 * entries carry its `iframeId`, so they can be dropped when it navigates or
 * goes away without touching the page's own entries for the same URL.
 */
export function resourceKey(entry: Pick<ResourceEntry, 'url' | 'iframeId'>): string {
  return `${entry.iframeId ?? ''}\u0000${entry.url}`;
}

/** One change to the list, as the main process reported it. */
export type ResourceOp =
  | { type: 'add'; entry: ResourceEntry }
  /** Top-level navigation: everything goes. */
  | { type: 'reset' }
  /** A cross-site iframe navigated or went away: drop what it reported. */
  | { type: 'drop-iframe'; iframeId: string };

interface ResourceStore {
  byKey: Record<string, ResourceEntry>;
  /** Top-level navigation: everything goes. */
  reset(): void;
  add(entry: ResourceEntry): void;
  addMany(entries: ResourceEntry[]): void;
  /** A cross-site iframe navigated or went away: drop what it reported. */
  dropIframe(iframeId: string): void;
  /** Applies changes in order as one update (a page load reports thousands of files). */
  apply(ops: readonly ResourceOp[]): void;
}

export const useResourceStore = create<ResourceStore>()((set) => ({
  byKey: {},
  reset: () => set({ byKey: {} }),
  add: (entry) => set((s) => ({ byKey: { ...s.byKey, [resourceKey(entry)]: entry } })),
  addMany: (entries) => set((s) => ({ byKey: { ...s.byKey, ...Object.fromEntries(entries.map((e) => [resourceKey(e), e])) } })),
  dropIframe: (iframeId) =>
    set((s) => ({ byKey: Object.fromEntries(Object.entries(s.byKey).filter(([, e]) => e.iframeId !== iframeId)) })),
  apply: (ops) =>
    set((s) => {
      if (!ops.length) return s;
      let byKey = { ...s.byKey };
      for (const op of ops) {
        if (op.type === 'reset') byKey = {};
        else if (op.type === 'add') byKey[resourceKey(op.entry)] = op.entry;
        else for (const key in byKey) if (byKey[key].iframeId === op.iframeId) delete byKey[key];
      }
      return { byKey };
    }),
}));

/**
 * One entry per URL. When several frames loaded the same file, the page's own
 * entry wins, then same-process iframes, then cross-site iframes.
 */
export function uniqueResources(byKey: Record<string, ResourceEntry>): ResourceEntry[] {
  const rank = (e: ResourceEntry) => (e.frame ? 1 : 0) + (e.iframeId ? 1 : 0);
  const best = new Map<string, ResourceEntry>();
  for (const entry of Object.values(byKey)) {
    const current = best.get(entry.url);
    if (!current || rank(entry) < rank(current) || (!!entry.overrideId && !current.overrideId && rank(entry) === rank(current))) {
      best.set(entry.url, entry);
    }
  }
  return [...best.values()];
}

export function findResource(byKey: Record<string, ResourceEntry>, url: string): ResourceEntry | undefined {
  return uniqueResources(byKey).find((e) => e.url === url);
}

/** Derives a value once per `byKey` object (replaced on every change), so selectors return stable results. */
function perVersion<T>(derive: (byKey: Record<string, ResourceEntry>) => T): (s: ResourceStore) => T {
  const cache = new WeakMap<Record<string, ResourceEntry>, T>();
  return (s) => {
    if (!cache.has(s.byKey)) cache.set(s.byKey, derive(s.byKey));
    return cache.get(s.byKey)!;
  };
}

/** `uniqueResources` of the current entries. */
export const selectUniqueResources = perVersion(uniqueResources);
export const selectResourceCount = (s: ResourceStore) => selectUniqueResources(s).length;
/** Distinct iframes that loaded files. */
export const selectIframeCount = perVersion((byKey) => new Set(Object.values(byKey).flatMap((e) => (e.frame ? [e.frame.url] : []))).size);
