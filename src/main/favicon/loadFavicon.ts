import { download } from './download';
import { inlineIcon } from './inlineIcon';
import type { FaviconDeps } from './types';

/** Candidates tried, in the order the page lists them. */
const MAX_CANDIDATES = 4;
/** The scheme of an icon given inline. */
const DATA_SCHEME = 'data:';

/**
 * The page's favicon as a data URL, from the candidates Chromium reports for it
 * (`page-favicon-updated`: its `<link rel="icon">`s, or `/favicon.ico`), trying
 * each in turn. Null if none of them is an image.
 */
export async function loadFavicon(candidates: string[], deps: FaviconDeps): Promise<string | null> {
  for (const url of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const icon = url.startsWith(DATA_SCHEME) ? inlineIcon(url) : await download(url, deps);
      if (icon) return icon;
    } catch {
      // Unreachable or refused: try the next one.
    }
  }
  return null;
}
