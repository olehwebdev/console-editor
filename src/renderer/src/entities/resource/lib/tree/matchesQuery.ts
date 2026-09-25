import type { ResourceEntry } from '@common/types';
import { workerScriptUrl } from './workerScriptUrl';

/** True when the query matches the file URL, or the iframe or worker that loaded it. */
export function matchesQuery(entry: ResourceEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    entry.url.toLowerCase().includes(q) ||
    (!!entry.frame && entry.frame.url.toLowerCase().includes(q)) ||
    !!workerScriptUrl(entry)?.toLowerCase().includes(q)
  );
}
