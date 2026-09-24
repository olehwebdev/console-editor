import { useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import type { AppEventOf } from '../types';

/** Takes the main process's override list. */
export function syncOverrides(event: AppEventOf<'overrides-changed'>): void {
  useOverrideStore.getState().setAll(event.overrides);
  // Tabs whose override was deleted elsewhere become unsaved tabs again.
  for (const tab of useTabStore.getState().tabs) {
    if (tab.overrideId && !event.overrides.some((o) => o.id === tab.overrideId)) useTabStore.getState().patch(tab.id, { overrideId: undefined });
  }
}
