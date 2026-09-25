import type { ResourceEntry } from '@common/types';
import { fileName } from '@/shared/lib';
import { WORKER_NAME } from './constants';

/** A worker built by the page's own code: its URL says nothing useful. */
const INLINE_URL = /^(blob|data):/;

/** Tooltip text describing which worker loaded a file. */
export function describeWorker(entry: ResourceEntry): string | null {
  if (!entry.worker) return null;
  const { type, url } = entry.worker;
  const name = WORKER_NAME[type];
  if (type === 'worklet') return 'Loaded by a worklet';
  if (entry.url === url) return `${name[0].toUpperCase()}${name.slice(1)} script`;
  if (INLINE_URL.test(url)) return `Loaded by an inline ${name}`;
  return `Loaded by ${name} ${fileName(url)}`;
}
