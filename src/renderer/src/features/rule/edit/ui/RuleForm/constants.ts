/** Lower-case names of the headers that steer caching: the browser's HTTP cache keeps the server's. */
export const CACHE_HEADER_NAMES: ReadonlySet<string> = new Set(['cache-control', 'expires', 'pragma']);

/** Lower-case names of a document's security headers: changing them re-serves the page. */
export const DOCUMENT_SECURITY_HEADER_NAMES: ReadonlySet<string> = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
]);

/** Lower-case names of the header a CORS rule sets better. */
export const ALLOW_ORIGIN_HEADER_NAMES: ReadonlySet<string> = new Set(['access-control-allow-origin']);
