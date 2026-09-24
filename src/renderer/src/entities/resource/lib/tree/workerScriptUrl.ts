import type { ResourceEntry } from '@common/types';

/** The script URL of the worker that loaded a file. A worklet has none of its own (its URL is the page's). */
export function workerScriptUrl(entry: ResourceEntry): string | undefined {
  return entry.worker && entry.worker.type !== 'worklet' ? entry.worker.url : undefined;
}
