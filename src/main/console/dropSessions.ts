import type { SessionKey } from './ConsoleFrames';

/**
 * A session went away: it is dropped from `sessions`, after running what it set up to undo. The page's own session
 * (`undefined`) takes every session with it, as interception stopped. Returns the sessions dropped.
 */
export function dropSessions(sessions: Map<SessionKey, { dispose: Array<() => void> }>, id: SessionKey): SessionKey[] {
  const gone = id === undefined ? [...sessions.keys()] : [id];
  for (const key of gone) {
    for (const dispose of sessions.get(key)?.dispose.splice(0) ?? []) dispose();
    sessions.delete(key);
  }
  return gone;
}
