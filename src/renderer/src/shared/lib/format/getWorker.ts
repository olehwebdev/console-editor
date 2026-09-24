import type { FormatResponse } from './format.worker';
import FormatWorker from './format.worker?worker';
import { scheduleShutdown } from './scheduleShutdown';
import { workerState } from './workerState';

export function getWorker(): Worker {
  clearTimeout(workerState.idleTimer);
  if (!workerState.worker) {
    workerState.worker = new FormatWorker();
    workerState.worker.onmessage = (event: MessageEvent<FormatResponse>) => {
      const job = workerState.pending.get(event.data.id);
      if (!job) return;
      workerState.pending.delete(event.data.id);
      if ('error' in event.data) job.reject(new Error(event.data.error));
      else job.resolve(event.data.text);
      if (workerState.pending.size === 0) scheduleShutdown();
    };
  }
  return workerState.worker;
}
