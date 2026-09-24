import { workerState } from './workerState';

/**
 * Formatting a multi-MB bundle leaves hundreds of MB of token arrays in the
 * worker's heap; shut the worker down once idle instead of keeping that around.
 */
const IDLE_SHUTDOWN_MS = 10_000;

export function scheduleShutdown(): void {
  clearTimeout(workerState.idleTimer);
  workerState.idleTimer = setTimeout(() => {
    if (workerState.pending.size === 0) {
      workerState.worker?.terminate();
      workerState.worker = null;
    }
  }, IDLE_SHUTDOWN_MS);
}
