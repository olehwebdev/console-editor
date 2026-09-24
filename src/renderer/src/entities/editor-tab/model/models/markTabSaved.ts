import { useTabStore } from '../store';
import { entries } from './entries';

/** Marks the text at `versionId` as saved. */
export function markTabSaved(tabId: string, versionId: number): void {
  const entry = entries.get(tabId);
  if (!entry) return;
  entry.savedVersionId = versionId;
  useTabStore.getState().patch(tabId, { dirty: entry.model.getAlternativeVersionId() !== versionId });
}
