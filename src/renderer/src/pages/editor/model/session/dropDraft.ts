import { api } from '@/shared/api';
import { sessionSync } from './sessionSync';
import { track } from './track';

export function dropDraft(tabId: string): void {
  const { draftTimers, baseWritten, drafted, failedDrafts } = sessionSync;
  clearTimeout(draftTimers.get(tabId));
  draftTimers.delete(tabId);
  baseWritten.delete(tabId);
  failedDrafts.delete(tabId);
  if (drafted.delete(tabId)) track(api.deleteDraft(tabId));
}
