import type { TabMeta } from '@/entities/editor-tab';
import { useResourceStore } from '@/entities/resource';

/**
 * The listed bundle a file tab shows. An override tab's own URL is the one it was made from; after a
 * redeploy a glob override serves a file of another hash, which is the bundle whose map applies.
 */
export function bundleUrlOf(tab: Pick<TabMeta, 'url' | 'overrideId'>): string {
  if (!tab.overrideId) return tab.url;
  return Object.values(useResourceStore.getState().byKey).find((entry) => entry.overrideId === tab.overrideId)?.url ?? tab.url;
}
