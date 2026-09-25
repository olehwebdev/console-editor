import { getWorker } from './getWorker';
import type { SourceMapRequestOf, SourceMapRequestType, SourceMapWorkerReplies, WorkerMessage } from './types';
import { workerState } from './workerState';

/**
 * Asks the source-map worker (parsing, lookups and lining up, off the UI thread). `transfer` moves
 * buffers instead of copying them (a map's bytes).
 */
export function askSourceMapWorker<T extends SourceMapRequestType>(request: SourceMapRequestOf<T>, transfer: Transferable[] = []): Promise<SourceMapWorkerReplies[T]> {
  const id = workerState.nextId++;
  return new Promise((resolve, reject) => {
    workerState.pending.set(id, { resolve: resolve as (reply: unknown) => void, reject });
    getWorker().postMessage({ id, request } satisfies WorkerMessage, transfer);
  });
}
