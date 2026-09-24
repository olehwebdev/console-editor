import type { ResourceKind } from '@common/types';
import type { FormatRequest } from './format.worker';
import { getWorker } from './getWorker';
import { workerState } from './workerState';

let nextId = 1;

/** Pretty-prints JS/CSS/HTML off the UI thread (large bundles take a while). */
export function formatCode(text: string, kind: ResourceKind): Promise<string> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    workerState.pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, kind, text } satisfies FormatRequest);
  });
}
