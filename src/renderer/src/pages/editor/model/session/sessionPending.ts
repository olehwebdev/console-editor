import { sessionSync } from './sessionSync';

/** Edits or tab changes are waiting to be written (they came in while a flush ran, say). */
export function sessionPending(): boolean {
  return !!sessionSync.syncing && (sessionSync.tabsTimer !== undefined || sessionSync.draftTimers.size > 0);
}
