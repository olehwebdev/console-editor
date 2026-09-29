import type { EverydayTab } from '../../../shared/types';
import { HTTP_URL } from '../../constants';

/** What a Firefox session says of a tab, as far as its current page goes. */
interface SessionTab {
  index?: number;
  entries?: Array<{ url?: unknown; title?: unknown }>;
}

/** The tabs a Firefox session (`recovery.jsonlz4`'s JSON) has open, window by window: the page each shows, if on the web. */
export function sessionTabsOf(json: string): EverydayTab[] {
  let session: { windows?: Array<{ tabs?: SessionTab[] }> };
  try {
    session = JSON.parse(json) as typeof session;
  } catch {
    return [];
  }
  return (session.windows ?? []).flatMap((w) =>
    (w.tabs ?? []).flatMap((tab) => {
      const entries = tab.entries ?? [];
      const entry = entries[(tab.index ?? entries.length) - 1];
      const url = typeof entry?.url === 'string' ? entry.url : '';
      if (!HTTP_URL.test(url)) return [];
      return [{ url, title: typeof entry?.title === 'string' && entry.title ? entry.title : url }];
    }),
  );
}
