import { IDLE_SHUTDOWN_MS } from './constants';
import { workerState } from './workerState';

/** Decoded maps take hundreds of MB: once the worker has been idle a while, it goes, and them with it. */
export function scheduleShutdown(): void {
  clearTimeout(workerState.idleTimer);
  workerState.idleTimer = setTimeout(() => {
    if (workerState.pending.size === 0) {
      workerState.worker?.terminate();
      workerState.worker = null;
    }
  }, IDLE_SHUTDOWN_MS);
}
