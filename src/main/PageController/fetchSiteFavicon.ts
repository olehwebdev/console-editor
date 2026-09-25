import type { Session } from 'electron';
import { loadFavicon } from '../favicon';
import { shrinkFavicon } from './shrinkFavicon';

/** The site's icon as a small data URL, from the candidates in `page-favicon-updated`; null if none loads. */
export function fetchSiteFavicon(siteSession: Session, candidates: string[]): Promise<string | null> {
  return loadFavicon(candidates, {
    // Through the site's session, like the page's own request for it (an intranet site may want its cookies).
    fetch: (url) => siteSession.fetch(url, { credentials: 'include' }),
    shrink: shrinkFavicon,
  });
}
