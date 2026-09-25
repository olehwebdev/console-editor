import type { HeldRequest } from '@common/types';
import { getTabModel, useTabStore, type TabMeta } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import type { SendInput } from './types';
import { useHeldDrafts } from './useHeldDrafts';

/** A held tab's request and everything the user changed on it; undefined for any other tab, or one let go. */
export function heldEdits(tabId: string | null): (SendInput & { tab: TabMeta; held: HeldRequest; version: number }) | undefined {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const held = tab?.held ? useHeldStore.getState().held.find((h) => h.id === tab.held) : undefined;
  const draft = held ? useHeldDrafts.getState().drafts[held.id] : undefined;
  const model = tab ? getTabModel(tab.id) : undefined;
  if (!tab || !held || !draft || !model) return undefined;
  return { tab, held, draft, text: model.getValue(), edited: tab.dirty, version: model.getAlternativeVersionId() };
}
