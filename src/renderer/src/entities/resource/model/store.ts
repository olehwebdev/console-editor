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

interface ResourceStore {
  byKey: Record<string, ResourceEntry>;
  /** Top-level navigation: everything goes. */
  reset(): void;
  add(entry: ResourceEntry): void;
  addMany(entries: ResourceEntry[]): void;
  /** A cross-site iframe navigated or went away: drop what it reported. */
  dropIframe(iframeId: string): void;
}

export const useResourceStore = create<ResourceStore>()((set) => ({
  byKey: {},
  reset: () => set({ byKey: {} }),
  add: (entry) => set((s) => ({ byKey: { ...s.byKey, [resourceKey(entry)]: entry } })),
  addMany: (entries) => set((s) => ({ byKey: { ...s.byKey, ...Object.fromEntries(entries.map((e) => [resourceKey(e), e])) } })),
  dropIframe: (iframeId) =>
    set((s) => ({ byKey: Object.fromEntries(Object.entries(s.byKey).filter(([, e]) => e.iframeId !== iframeId)) })),
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
