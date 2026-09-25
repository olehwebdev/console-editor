/** What the view shows before a site loads, and the URL it then reports (shown as none). */
export const BLANK_PAGE = 'about:blank';

/** Fetches a live file (or its source map) past the HTTP cache. */
export const BYPASS_CACHE = { 'Cache-Control': 'no-cache' } as const;
