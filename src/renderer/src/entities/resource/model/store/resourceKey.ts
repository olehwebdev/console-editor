import type { ResourceEntry } from '@common/types';

/** Between an entry's iframe id and its URL: NUL, which neither contains. */
const KEY_SEPARATOR = '\u0000';

/**
 * Files the page loaded, keyed per reporting session: a cross-site iframe's
 * entries carry its `iframeId`, so they can be dropped when it navigates or
 * goes away without touching the page's own entries for the same URL.
 */
export function resourceKey(entry: Pick<ResourceEntry, 'url' | 'iframeId'>): string {
  return `${entry.iframeId ?? ''}${KEY_SEPARATOR}${entry.url}`;
}
