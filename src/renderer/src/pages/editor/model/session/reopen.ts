import type { SessionTab } from '@common/types';
import { api } from '@/shared/api';
import { createTabModel, getTabModel, replaceTabText, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { openOverride, openResource } from '@/features/open-resource';
import { sessionSync } from './sessionSync';

export async function reopen(tab: SessionTab): Promise<void> {
  const draft = await api.getDraft(tab.id).catch(() => null);
  if (tab.overrideId && useOverrideStore.getState().byId[tab.overrideId]) {
    await openOverride(tab.overrideId, { tabId: tab.id, activate: false });
  } else if (draft) {
    // Everything this tab needs is on disk: no need for the network.
    const base = draft.base ?? draft.content;
    const { lite } = createTabModel(tab.id, tab.url, tab.kind, base, base);
    useTabStore
      .getState()
      .add({ id: tab.id, url: tab.url, kind: tab.kind, originalHash: tab.originalHash, lite, dirty: false, saving: false }, false);
  } else {
    await openResource(tab.url, { tabId: tab.id, activate: false });
  }
  if (draft && getTabModel(tab.id)) {
    // One undoable edit on top of the saved text, so the tab shows as unsaved and undo reveals what changed.
    replaceTabText(tab.id, draft.content);
    sessionSync.drafted.add(tab.id);
    if (draft.base !== undefined) sessionSync.baseWritten.add(tab.id);
  }
}
