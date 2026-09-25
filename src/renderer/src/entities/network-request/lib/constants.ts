/** The groups the Network panel filters requests by, in the order it offers them. */
export const REQUEST_GROUPS = ['fetch', 'doc', 'js', 'css', 'img', 'media', 'font', 'other'] as const;

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
};

/** A response the Network panel can open as JSON (or plain text): a JSON API's, say. */
export const TEXT_RESPONSE = /json|^text\/|xml|javascript|graphql/i;
