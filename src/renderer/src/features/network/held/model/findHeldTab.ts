import { useTabStore, type TabMeta } from '@/entities/editor-tab';

/** The tab showing a held request, if it is open. */
export function findHeldTab(heldId: string): TabMeta | undefined {
  return useTabStore.getState().tabs.find((t) => t.held === heldId);
}
