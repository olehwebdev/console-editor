import type { ResourceEntry } from '@common/types';

/** True when the query matches the file URL or the iframe it was loaded in. */
export function matchesQuery(entry: ResourceEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return entry.url.toLowerCase().includes(q) || (!!entry.frame && entry.frame.url.toLowerCase().includes(q));
}
