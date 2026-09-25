import type { ResourceEntry } from '@common/types';

/** Between an entry's iframe id, worker id and URL: NUL, which none of them contains. */
const KEY_SEPARATOR = '\u0000';

/**
 * Files the page loaded, keyed per reporting session: a cross-site iframe's
 * entries carry its `iframeId` and a worker's its `workerId`, so they can be
 * dropped when it navigates or goes away without touching the page's own
 * entries for the same URL.
 */
export function resourceKey(entry: Pick<ResourceEntry, 'url' | 'iframeId' | 'workerId'>): string {
  return `${entry.iframeId ?? ''}${KEY_SEPARATOR}${entry.workerId ?? ''}${KEY_SEPARATOR}${entry.url}`;
}
