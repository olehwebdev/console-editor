import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { opening } from './opening';
import type { OpenOptions } from './types';

/**
 * Opens an override's served content (its diff base is fetched only if a diff is shown). Resolves to
 * the tab's id, or null when it didn't open.
 */
export async function openOverride(id: string, options: OpenOptions = {}): Promise<string | null> {
  const { activate = true } = options;
  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => t.overrideId === id);
  if (existing) {
    if (activate) tabs.activate(existing.id);
    return existing.id;
  }
  if (opening.has(id)) return null;
  opening.add(id);
  try {
    const o = await api.getOverride(id);
    const tabId = options.tabId ?? newTabId();
    const { lite } = createTabModel(tabId, o.sourceUrl, o.kind, o.content);
    useTabStore
      .getState()
      .add({ id: tabId, url: o.sourceUrl, kind: o.kind, overrideId: o.id, originalHash: o.originalHash, lite, dirty: false, saving: false }, activate);
    return tabId;
  } catch (err) {
    toast({ title: 'Could not open the override', description: errorMessage(err), tone: 'danger' });
    return null;
  } finally {
    opening.delete(id);
  }
}
