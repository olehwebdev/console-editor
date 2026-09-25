import { scheduleShutdown } from './scheduleShutdown';
import SourceMapWorker from './sourceMap.worker?worker';
import { stopSourceMapWorker } from './stopSourceMapWorker';
import type { WorkerReply } from './types';
import { workerState } from './workerState';

export function getWorker(): Worker {
  clearTimeout(workerState.idleTimer);
  if (!workerState.worker) {
    const worker = new SourceMapWorker();
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const job = workerState.pending.get(event.data.id);
      if (!job) return;
      workerState.pending.delete(event.data.id);
      if ('error' in event.data) job.reject(new Error(event.data.error));
      else job.resolve(event.data.reply);
      if (workerState.pending.size === 0) scheduleShutdown();
    };
    // A worker that crashed (out of memory on a huge map, say) is replaced on the next request.
    worker.onerror = () => stopSourceMapWorker();
    worker.onmessageerror = () => stopSourceMapWorker();
    workerState.worker = worker;
  }
  return workerState.worker;
}
