import { HISTORY_STORAGE_PREFIX } from './constants';
import { promptHistory } from './promptHistory';

/** The code run in a workspace, oldest first. */
export function historyOf(workspaceId: string): string[] {
  const known = promptHistory.byWorkspace.get(workspaceId);
  if (known) return known;
  let saved: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${workspaceId}`) ?? '[]');
    if (Array.isArray(parsed)) saved = parsed.filter((line): line is string => typeof line === 'string');
  } catch {
    // Unreadable or blocked: start afresh.
  }
  promptHistory.byWorkspace.set(workspaceId, saved);
  return saved;
}
