import type { ConsoleAction } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { findFrame, useFrameStore } from '@/entities/frame';
import { useActionRuns } from './useActionRuns';

/**
 * Runs an action's code in its frame, as the console runs code: its input and
 * result show there too. A run still going is left to finish (a second press
 * doesn't queue another).
 */
export async function runAction(action: ConsoleAction): Promise<void> {
  const { runs, setRun } = useActionRuns.getState();
  if (runs[action.id]?.state === 'running') return;
  const frame = findFrame(useFrameStore.getState().frames, action.target, action.targetName);
  if (!frame?.canRun) {
    setRun(action.id, { state: 'failed', message: frame ? 'Its frame runs no JavaScript.' : "Its frame isn't on the page." });
    return;
  }
  setRun(action.id, { state: 'running' });
  try {
    setRun(action.id, { state: 'done', entry: await api.evaluateInFrame(frame.id, action.code) });
  } catch (err) {
    setRun(action.id, { state: 'failed', message: errorMessage(err) });
  }
}
