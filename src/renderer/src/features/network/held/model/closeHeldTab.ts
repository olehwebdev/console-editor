import { disposeTabModel, useTabStore } from '@/entities/editor-tab';
import { findHeldTab } from './findHeldTab';
import { useHeldDrafts } from './useHeldDrafts';

/** Closes a held request's tab, if open, and forgets its edits. */
export function closeHeldTab(heldId: string): void {
  useHeldDrafts.getState().drop(heldId);
  const tab = findHeldTab(heldId);
  if (!tab) return;
  useTabStore.getState().remove(tab.id);
  // After React has moved the editor to another model.
  setTimeout(() => disposeTabModel(tab.id), 0);
}
