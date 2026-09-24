import { HISTORY_STORAGE_PREFIX, MAX_HISTORY } from './constants';
import { historyOf } from './historyOf';
import { promptHistory } from './promptHistory';

/** Adds code to a workspace's history (once, if it is the same as the last), and keeps it for the next run. */
export function rememberCode(workspaceId: string, code: string): void {
  const history = historyOf(workspaceId);
  if (history.at(-1) === code) return;
  const next = [...history, code].slice(-MAX_HISTORY);
  promptHistory.byWorkspace.set(workspaceId, next);
  try {
    localStorage.setItem(`${HISTORY_STORAGE_PREFIX}${workspaceId}`, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the history still lasts until the app closes.
  }
}
