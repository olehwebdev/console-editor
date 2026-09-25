import { saveDraft } from './saveDraft';
import { saveTabs } from './saveTabs';
import { sessionSync } from './sessionSync';

/** Writes everything still pending (the window is closing, or the workspace changing). Resolves false if something could not be written. */
export async function flushSession(): Promise<boolean> {
  if (sessionSync.syncing) {
    if (sessionSync.tabsTimer || sessionSync.tabsFailed) saveTabs();
    for (const tabId of new Set([...sessionSync.draftTimers.keys(), ...sessionSync.failedDrafts])) saveDraft(tabId);
  }
  const results = await Promise.allSettled(sessionSync.writes);
  return results.every((r) => r.status === 'fulfilled');
}
