import type { WorkerType } from '../../../shared/types';

/** The CDP target types the engine tells apart: an out-of-process iframe's, and each kind of worker's. */
export const TARGET_TYPE = {
  iframe: 'iframe',
  worker: 'worker',
  sharedWorker: 'shared_worker',
  serviceWorker: 'service_worker',
  worklet: 'worklet',
} as const satisfies Record<string, 'iframe' | WorkerType>;

/** `Page.frameDetached` reason of a frame that moved to another process (it still exists). */
export const FRAME_SWAP_REASON = 'swap';

/** Where the HTTP status classes the engine tells apart start; each ends where the next one starts. */
export const HTTP_SUCCESSFUL = 200;
export const HTTP_REDIRECTION = 300;
export const HTTP_CLIENT_ERROR = 400;

/** The Content-Type header as it is looked up: header names are matched lower-case. */
export const CONTENT_TYPE = 'content-type';

/** HTML's media type: what a document is taken to be when upstream sends no Content-Type. */
export const HTML_MIME_TYPE = 'text/html';

/** Fetch.failRequest's reason for a request a rule blocked (shows as net::ERR_BLOCKED_BY_CLIENT). */
export const BLOCKED_BY_CLIENT = 'BlockedByClient';
