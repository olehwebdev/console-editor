import type { ResourceKind } from '../../shared/types';
import type { FormatRequest, FormatResponse } from './format.worker';
import FormatWorker from './format.worker?worker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve(text: string): void; reject(err: Error): void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new FormatWorker();
    worker.onmessage = (event: MessageEvent<FormatResponse>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if ('error' in event.data) job.reject(new Error(event.data.error));
      else job.resolve(event.data.text);
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

export { looksMinified } from '../../shared/minified';
