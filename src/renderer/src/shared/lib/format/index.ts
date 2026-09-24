import type { ResourceKind } from '@common/types';
import type { FormatRequest, FormatResponse } from './format.worker';
import FormatWorker from './format.worker?worker';

export { looksMinified } from '@common/minified';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve(text: string): void; reject(err: Error): void }>();
let idleTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Formatting a multi-MB bundle leaves hundreds of MB of token arrays in the
 * worker's heap; shut the worker down once idle instead of keeping that around.
 */
const IDLE_SHUTDOWN_MS = 10_000;

function scheduleShutdown(): void {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pending.size === 0) {
      worker?.terminate();
      worker = null;
    }
  }, IDLE_SHUTDOWN_MS);
}

function getWorker(): Worker {
  clearTimeout(idleTimer);
  if (!worker) {
    worker = new FormatWorker();
    worker.onmessage = (event: MessageEvent<FormatResponse>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if ('error' in event.data) job.reject(new Error(event.data.error));
      else job.resolve(event.data.text);
      if (pending.size === 0) scheduleShutdown();
    };
  }
  return worker;
}

/** Pretty-prints JS/CSS/HTML off the UI thread (large bundles take a while). */
export function formatCode(text: string, kind: ResourceKind): Promise<string> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, kind, text } satisfies FormatRequest);
  });
}
