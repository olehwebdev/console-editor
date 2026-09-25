import { handleSourceMapRequest, type LoadedMaps } from './host';
import type { WorkerMessage, WorkerReply } from './types';

/** The decoded maps this worker holds, by bundle URL. */
const maps: LoadedMaps = new Map();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, request } = event.data;
  try {
    self.postMessage({ id, reply: handleSourceMapRequest(maps, request) } satisfies WorkerReply);
  } catch (err) {
    self.postMessage({ id, error: String(err) } satisfies WorkerReply);
  }
};
