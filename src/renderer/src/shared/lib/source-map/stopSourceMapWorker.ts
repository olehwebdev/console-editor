import { workerState } from './workerState';

/**
 * Stops the worker now (dropping every map it holds) and fails the requests it owes. Synchronous, so
 * callers never wait on a worker that may not answer.
 */
export function stopSourceMapWorker(): void {
  clearTimeout(workerState.idleTimer);
  workerState.worker?.terminate();
  workerState.worker = null;
  const pending = [...workerState.pending.values()];
  workerState.pending.clear();
  for (const job of pending) job.reject(new Error('The source-map worker stopped'));
}
