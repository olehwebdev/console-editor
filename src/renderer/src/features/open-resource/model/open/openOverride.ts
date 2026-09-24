import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { opening } from './opening';
import type { OpenOptions } from './types';

/** Opens an override's served content (its diff base is fetched only if a diff is shown). */
export async function openOverride(id: string, options: OpenOptions = {}): Promise<void> {
  const { activate = true } = options;
  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => t.overrideId === id);
  if (existing) {
    if (activate) tabs.activate(existing.id);
    return;
  }
  if (opening.has(id)) return;
  opening.add(id);
  try {
    const o = await api.getOverride(id);
    const tabId = options.tabId ?? newTabId();
    const { lite } = createTabModel(tabId, o.sourceUrl, o.kind, o.content);
    useTabStore
      .getState()
      .add({ id: tabId, url: o.sourceUrl, kind: o.kind, overrideId: o.id, originalHash: o.originalHash, lite, dirty: false, saving: false }, activate);
  } catch (err) {
    toast({ title: 'Could not open the override', description: errorMessage(err), tone: 'danger' });
  } finally {
    opening.delete(id);
  }
}
