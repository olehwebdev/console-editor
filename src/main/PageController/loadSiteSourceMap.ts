import type { Session } from 'electron';
import type { ResourceContent, SourceMapFile, SourceMapRequest } from '../../shared/types';
import { loadSourceMap } from '../sourceMap';
import { BYPASS_CACHE } from './constants';

/**
 * A listed script's or stylesheet's source map, found and downloaded (never parsed) through the site's
 * session. `pageUrl` is the page shown when it was asked for: its origin, like the bundle's, gets the cookies.
 */
export function loadSiteSourceMap(
  request: SourceMapRequest,
  siteSession: Session,
  content: (url: string) => Promise<ResourceContent>,
  pageUrl: string,
): Promise<SourceMapFile> {
  return loadSourceMap(request, {
    content,
    fetch: (url, init) => siteSession.fetch(url, { ...init, headers: BYPASS_CACHE }),
    pageUrl: () => pageUrl,
  });
}
