import type { SessionDraft } from '@common/types';
import { api } from '@/shared/api';
import { getTabBase, getTabModel, useTabStore } from '@/entities/editor-tab';
import { sessionSync } from './sessionSync';
import { track } from './track';

export function saveDraft(tabId: string): void {
  const { draftTimers, baseWritten, drafted, failedDrafts } = sessionSync;
  clearTimeout(draftTimers.get(tabId));
  draftTimers.delete(tabId);
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  if (!tab?.dirty || !model) return;
  const draft: SessionDraft = { content: model.getValue() };
  if (!tab.overrideId && !baseWritten.has(tabId)) {
    const base = getTabBase(tabId);
    if (base !== undefined) draft.base = base;
    baseWritten.add(tabId);
  }
  drafted.add(tabId);
  track(
    api.saveDraft(tabId, draft).then(
      () => failedDrafts.delete(tabId),
      (err: unknown) => {
        failedDrafts.add(tabId);
        // Written again in full next time (the base too, if it was part of this one).
        if (draft.base !== undefined) baseWritten.delete(tabId);
        throw err;
      },
    ),
  );
}
