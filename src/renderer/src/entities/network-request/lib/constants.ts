/** The groups the Network panel filters requests by, in the order it offers them. */
export const REQUEST_GROUPS = ['fetch', 'doc', 'js', 'css', 'img', 'media', 'font', 'ws', 'other'] as const;

export type RequestGroup = (typeof REQUEST_GROUPS)[number];

/**
 * The group of each `Network` type; any other is `other`. Fetch/XHR holds what a page's code asks for:
 * fetch(), XMLHttpRequest, their CORS preflights and event streams.
 */
export const GROUP_OF_TYPE: Readonly<Record<string, RequestGroup>> = {
  Fetch: 'fetch',
  XHR: 'fetch',
  EventSource: 'fetch',
  Preflight: 'fetch',
  Document: 'doc',
  Script: 'js',
  Stylesheet: 'css',
  Image: 'img',
  Media: 'media',
  TextTrack: 'media',
  Font: 'font',
  WebSocket: 'ws',
};

/** A response the Network panel can open as JSON (or plain text): a JSON API's, say. */
export const TEXT_RESPONSE = /json|^text\/|xml|javascript|graphql/i;

/** The header a request names the page it came from with; fetch() takes it as `referrer`. */
export const REFERER_HEADER = 'referer';

/** Headers fetch() can't set (the browser's own), left out of Copy as fetch. Lower case. */
export const UNSETTABLE_HEADERS: ReadonlySet<string> = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  REFERER_HEADER,
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
]);

/** Header prefixes fetch() can't set either. */
export const UNSETTABLE_HEADER_PREFIXES: readonly string[] = ['proxy-', 'sec-'];
